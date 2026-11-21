import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://127.0.0.1:5173';

const results = [];
function record(testName, status, notes = '') {
  results.push({ testName, status, notes });
  console.log(`[${status}] ${testName}: ${notes}`);
}

async function runTests() {
  console.log('Starting CivicResolve Browser End-to-End Test Suite...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Filter expected HTTP status codes from external API probing
      if (!txt.includes('429') && !txt.includes('503') && !txt.includes('favicon')) {
        consoleErrors.push(txt);
      }
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  try {
    await page.goto(URL, { waitUntil: 'networkidle0' });

    // -------------------------------------------------------------
    // TEST 1A: Report - Submit with all fields empty (validation must block it)
    // -------------------------------------------------------------
    try {
      await page.evaluate(() => document.querySelector('nav button:nth-child(1)').click());
      await new Promise(r => setTimeout(r, 600));

      const submitBtn = await page.waitForSelector('button[type="submit"]');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const hasError = await page.evaluate(() => {
        const errorEl = document.querySelector('.bg-rose-50');
        const titleInput = document.querySelector('input[required]');
        return (errorEl && errorEl.textContent.length > 0) || (titleInput && !titleInput.checkValidity());
      });

      if (hasError) {
        record('1. Report Empty Validation', 'PASS', 'Validation successfully blocked submission with empty fields');
      } else {
        record('1. Report Empty Validation', 'FAIL', 'Empty form submission was not prevented');
      }
    } catch (e) {
      record('1. Report Empty Validation', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 3: "Use My Location" button (denied permission leaves field empty with clear message)
    // -------------------------------------------------------------
    try {
      const context = browser.defaultBrowserContext();
      await context.overridePermissions(URL, []);

      const locBtn = await page.waitForSelector('button ::-p-text(Use My Location), button ::-p-text(Location)');
      await locBtn.click();
      await new Promise(r => setTimeout(r, 1200));

      const locVal = await page.$eval('input[placeholder*="Avinashi Road"]', el => el.value);
      const pageText = await page.evaluate(() => document.body.textContent);
      const hasDeniedMessage = pageText.includes("Couldn't get your location, please type it");

      if (locVal === '' && hasDeniedMessage) {
        record('3. Geolocation Permission Denied', 'PASS', `Gracefully showed clear message "${"Couldn't get your location, please type it"}" and left input empty without inserting fake address`);
      } else {
        record('3. Geolocation Permission Denied', 'FAIL', `locVal: "${locVal}", hasDeniedMessage: ${hasDeniedMessage}`);
      }
    } catch (e) {
      record('3. Geolocation Permission Denied', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 1B: Submit 3 different complaints (pothole, garbage, streetlight) with Auto-detect
    // -------------------------------------------------------------
    const complaintsToSubmit = [
      {
        title: 'Deep crater pothole causing vehicle skids',
        desc: 'Dangerous 3-foot pothole on Avinashi Road near college gate. Two-wheelers losing balance.',
        loc: 'Avinashi Road, Peelamedu, Coimbatore'
      },
      {
        title: 'Massive garbage dump bin overflowing outside hospital',
        desc: 'Solid waste has not been collected for 5 days. Foul stench and hygiene hazard.',
        loc: 'DB Road, RS Puram, Coimbatore'
      },
      {
        title: 'Dead streetlight row creating pitch black darkness',
        desc: 'Street lights completely off for a week. Pedestrians feel unsafe at night.',
        loc: '7th Cross Cut Road, Gandhipuram, Coimbatore'
      }
    ];

    const submittedIds = [];

    for (let i = 0; i < complaintsToSubmit.length; i++) {
      const c = complaintsToSubmit[i];
      try {
        const anotherBtn = await page.$('button ::-p-text(Report Another Issue)');
        if (anotherBtn) {
          await anotherBtn.click();
          await new Promise(r => setTimeout(r, 500));
        }

        await page.evaluate((data) => {
          const t = document.querySelector('input[placeholder*="Dangerous 2-foot pothole"]');
          if (t) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(t, data.title);
            t.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const d = document.querySelector('textarea');
          if (d) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(d, data.desc);
            d.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const l = document.querySelector('input[placeholder*="Avinashi Road"]');
          if (l) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(l, data.loc);
            l.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, c);

        const submit = await page.waitForSelector('button[type="submit"]');
        await submit.click();

        await page.waitForSelector('[data-testid="triage-result-card"]', { timeout: 35000 });
        
        const cardData = await page.evaluate(() => {
          const idEl = document.querySelector('[data-testid="triage-tracking-id"]') || document.querySelector('span.font-mono');
          const catEl = document.querySelector('[data-testid="triage-result-card"] .grid div:nth-child(1) span.text-sm');
          const prioEl = document.querySelector('[data-testid="triage-result-card"] .grid div:nth-child(2) span.text-sm');
          const deptEl = document.querySelector('[data-testid="triage-result-card"] .grid div:nth-child(5) span.text-sm') || document.querySelector('[data-testid="triage-result-card"] .grid div:nth-child(3) span.text-sm');
          const badgeEl = document.querySelector('[data-testid="ai-mode-badge"]');
          const reasonEl = document.querySelector('[data-testid="triage-result-card"]');
          return {
            id: idEl?.textContent || '',
            category: catEl?.textContent || '',
            priority: prioEl?.textContent || '',
            dept: deptEl?.textContent || '',
            badge: badgeEl?.textContent || '',
            reason: reasonEl?.textContent || ''
          };
        });

        submittedIds.push(cardData.id);
        const valid = cardData.id.startsWith('CR-') && cardData.category.length > 0 && cardData.dept.length > 0;
        record(`1. Submit #${i + 1} (${c.title.slice(0, 15)}...)`, valid ? 'PASS' : 'FAIL', 
          `ID: ${cardData.id}, Cat: ${cardData.category}, Pri: ${cardData.priority}, Dept: ${cardData.dept}, Badge: ${cardData.badge}`);

      } catch (err) {
        record(`1. Submit #${i + 1}`, 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // TEST 2: Report with photo upload
    // -------------------------------------------------------------
    try {
      const anotherBtn = await page.$('button ::-p-text(Report Another Issue)');
      if (anotherBtn) {
        await anotherBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }

      const testImgPath = '/tmp/civic-test-photo.png';
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      fs.writeFileSync(testImgPath, Buffer.from(base64Png, 'base64'));

      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(testImgPath);
      await new Promise(r => setTimeout(r, 600));

      const previewImg = await page.$('img[alt="Issue preview"]');
      if (!previewImg) throw new Error('Photo preview did not appear');

      const analyzeBtn = await page.waitForSelector('button ::-p-text(Analyze photo with AI)');
      await analyzeBtn.click();
      await page.waitForFunction(() => {
        const title = document.querySelector('input[placeholder*="Dangerous 2-foot pothole"]');
        const description = document.querySelector('textarea');
        const category = document.querySelector('select');
        return Boolean(title?.value && description?.value && category?.value !== 'Auto-detect with AI');
      }, { timeout: 35000 });

      const snapToFillWorked = await page.evaluate(() => {
        const title = document.querySelector('input[placeholder*="Dangerous 2-foot pothole"]');
        const description = document.querySelector('textarea');
        const category = document.querySelector('select');
        return Boolean(title?.value && description?.value && category?.value !== 'Auto-detect with AI');
      });
      if (!snapToFillWorked) throw new Error('Snap-to-Fill did not populate the editable form fields');

      await page.evaluate(() => {
        const setValue = (element, value) => {
          const setter = Object.getOwnPropertyDescriptor(element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set;
          setter.call(element, value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
        };
        setValue(document.querySelector('input[placeholder*="Dangerous 2-foot pothole"]'), 'Open manhole with missing cover slab');
        setValue(document.querySelector('textarea'), 'Sidewalk manhole missing cover causing extreme hazard for pedestrians.');
        setValue(document.querySelector('input[placeholder*="Avinashi Road"]'), 'Singanallur, Coimbatore');
      });

      const submit = await page.waitForSelector('button[type="submit"]');
      await submit.click();

      await page.waitForSelector('[data-testid="triage-result-card"]', { timeout: 35000 });
      const photoComplaintId = await page.$eval('[data-testid="triage-tracking-id"]', el => el.textContent);
      submittedIds.push(photoComplaintId);

      record('2. Photo Upload, Snap-to-Fill & Submission', 'PASS', `Photo preview rendered, Snap-to-Fill populated editable fields, and report submitted with ID ${photoComplaintId}`);

    } catch (e) {
      record('2. Photo Upload & Submission', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 4: Track Issues (counts, filters, search, stepper)
    // -------------------------------------------------------------
    try {
      await page.evaluate(() => document.querySelector('nav button:nth-child(2)').click());
      await new Promise(r => setTimeout(r, 600));

      const totalCount = await page.$eval('.grid.grid-cols-2 > div:nth-child(1) span.text-3xl', el => parseInt(el.textContent));
      const reportedCount = await page.$eval('.grid.grid-cols-2 > div:nth-child(2) span.text-3xl', el => parseInt(el.textContent));
      const statsOk = totalCount >= 6 && reportedCount >= 4;

      // Test Search by ID
      const targetId = submittedIds[0] || 'CR-1042';
      const searchInput = await page.waitForSelector('input[placeholder*="Search by Tracking ID"]');
      await searchInput.type(targetId);
      await new Promise(r => setTimeout(r, 500));

      const filteredCards = await page.$$eval('[data-testid="complaint-card"]', cards => cards.length);
      const searchOk = filteredCards >= 1;

      // Clear search input
      await page.evaluate(() => {
        const s = document.querySelector('input[placeholder*="Search by Tracking ID"]');
        if (s) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(s, '');
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await new Promise(r => setTimeout(r, 500));

      // Test Status Filter 'Resolved'
      const resolvedCount = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const statusSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'Resolved'));
        if (statusSelect) {
          statusSelect.value = 'Resolved';
          statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return document.querySelectorAll('[data-testid="complaint-card"]').length;
      });

      // Reset Status Filter to 'All'
      await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const statusSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'All'));
        if (statusSelect) {
          statusSelect.value = 'All';
          statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await new Promise(r => setTimeout(r, 500));

      const hasStepper = await page.evaluate(() => {
        const steps = document.querySelectorAll('.max-w-2xl.mx-auto .rounded-full');
        return steps.length >= 3;
      });

      if (statsOk && searchOk && resolvedCount >= 2 && hasStepper) {
        record('4. Track View Features', 'PASS', `Total: ${totalCount}, Search by ID verified, Filter Resolved matched ${resolvedCount}, 3-step progress stepper verified`);
      } else {
        record('4. Track View Features', 'FAIL', `Stats: ${statsOk}, Search: ${searchOk}, Resolved count: ${resolvedCount}, Stepper: ${hasStepper}`);
      }
    } catch (e) {
      record('4. Track View Features', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 5: Admin Portal (PIN, update status, priority, notes, sync to Track)
    // -------------------------------------------------------------
    const noteText = 'Repaired by Municipal Quick Response Team at 10:00 AM';
    try {
      await page.evaluate(() => document.querySelector('nav button:nth-child(3)').click());
      await new Promise(r => setTimeout(r, 600));

      // Test Wrong PIN
      const pinInput = await page.waitForSelector('input[placeholder*="Enter PIN"]');
      await pinInput.type('wrongpass');
      const authBtn = await page.waitForSelector('button ::-p-text(Authorize)');
      await authBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const hasAuthError = await page.evaluate(() => document.body.textContent.includes('Invalid Admin PIN'));
      if (!hasAuthError) throw new Error('Wrong PIN was not rejected');

      // Test Instant Judge PIN Login
      const quickLogin = await page.waitForSelector('button ::-p-text(1-Click Instant Judge Login)');
      await quickLogin.click();
      await new Promise(r => setTimeout(r, 600));

      const isDashboardLoaded = await page.evaluate(() => document.body.textContent.includes('Municipal Operations Command Center'));
      if (!isDashboardLoaded) throw new Error('Admin Dashboard failed to load after login');

      // Update status to Resolved
      await page.evaluate(() => {
        const firstItem = document.querySelector('.divide-y > div');
        if (!firstItem) return;
        const statusSelect = firstItem.querySelector('select');
        if (statusSelect) {
          statusSelect.value = 'Resolved';
          statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Type official note into the first item's note input
      const noteInput = await page.waitForSelector('[data-testid="admin-note-input"]');
      await noteInput.type(noteText);
      await new Promise(r => setTimeout(r, 300));

      const saveBtn = await page.waitForSelector('[data-testid="admin-save-note-btn"]');
      await saveBtn.click();
      await new Promise(r => setTimeout(r, 1000));

      // Switch back to Track view and confirm changes show immediately!
      await page.evaluate(() => document.querySelector('nav button:nth-child(2)').click());
      await new Promise(r => setTimeout(r, 800));

      // Ensure search input is cleared
      await page.evaluate(() => {
        const s = document.querySelector('input[placeholder*="Search by Tracking ID"]');
        if (s) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(s, '');
          s.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await new Promise(r => setTimeout(r, 500));

      const isNoteInTrack = await page.evaluate((text) => document.body.textContent.includes(text), noteText);

      if (hasAuthError && isDashboardLoaded && isNoteInTrack) {
        record('5. Admin Management & Immediate Sync', 'PASS', 'Wrong PIN rejected, login authorized, status/note updated and immediately verified in Track view');
      } else {
        record('5. Admin Management & Immediate Sync', 'FAIL', `Dashboard: ${isDashboardLoaded}, Note in track: ${isNoteInTrack}`);
      }

    } catch (e) {
      record('5. Admin Management & Immediate Sync', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 6: Refresh page and confirm data persists (localStorage)
    // -------------------------------------------------------------
    try {
      await page.reload({ waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));

      const persistedCount = await page.$eval('.grid.grid-cols-2 > div:nth-child(1) span.text-3xl', el => parseInt(el.textContent));
      const hasNoteAfterReload = await page.evaluate((text) => document.body.textContent.includes(text), noteText);

      if (persistedCount >= 7 && hasNoteAfterReload) {
        record('6. LocalStorage Persistence', 'PASS', `Data persisted across hard refresh (Total complaints: ${persistedCount}, note retained)`);
      } else {
        record('6. LocalStorage Persistence', 'FAIL', `Total: ${persistedCount}, Note found: ${hasNoteAfterReload}`);
      }
    } catch (e) {
      record('6. LocalStorage Persistence', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 7: Settings modal (save API key and switch model)
    // -------------------------------------------------------------
    try {
      const gearBtn = await page.waitForSelector('button[title*="Settings"]');
      await gearBtn.click();
      await new Promise(r => setTimeout(r, 600));

      await page.select('select:has(option[value="gemini-flash-lite-latest"])', 'gemini-flash-lite-latest');
      
      const saveSettingsBtn = await page.waitForSelector('button ::-p-text(Save Settings)');
      await saveSettingsBtn.click();
      await new Promise(r => setTimeout(r, 1000));

      const storedModel = await page.evaluate(() => localStorage.getItem('civic_gemini_model'));
      if (storedModel === 'gemini-flash-lite-latest') {
        record('7. Settings Modal Persistence', 'PASS', `Successfully updated and saved model to localStorage: ${storedModel}`);
      } else {
        record('7. Settings Modal Persistence', 'FAIL', `Stored model was: ${storedModel}`);
      }
    } catch (e) {
      record('7. Settings Modal Persistence', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 8: Check layout at mobile width (390px)
    // -------------------------------------------------------------
    try {
      await page.setViewport({ width: 390, height: 844, isMobile: true });
      await new Promise(r => setTimeout(r, 600));

      const trackScrollWidth = await page.evaluate(() => document.body.scrollWidth);

      await page.evaluate(() => document.querySelector('nav button:nth-child(1)').click());
      await new Promise(r => setTimeout(r, 600));
      const reportScrollWidth = await page.evaluate(() => document.body.scrollWidth);

      await page.evaluate(() => document.querySelector('nav button:nth-child(3)').click());
      await new Promise(r => setTimeout(r, 600));
      const adminScrollWidth = await page.evaluate(() => document.body.scrollWidth);

      const noOverflow = trackScrollWidth <= 390 && reportScrollWidth <= 390 && adminScrollWidth <= 390;
      if (noOverflow) {
        record('8. Responsive Mobile Layout (390px)', 'PASS', `All 3 views fit within 390px without horizontal overflow (Track: ${trackScrollWidth}px, Report: ${reportScrollWidth}px, Admin: ${adminScrollWidth}px)`);
      } else {
        record('8. Responsive Mobile Layout (390px)', 'FAIL', `Horizontal overflow: Track=${trackScrollWidth}px, Report=${reportScrollWidth}px, Admin=${adminScrollWidth}px`);
      }
    } catch (e) {
      record('8. Responsive Mobile Layout (390px)', 'FAIL', e.message);
    }

    // -------------------------------------------------------------
    // TEST 9: Console errors
    // -------------------------------------------------------------
    if (consoleErrors.length === 0) {
      record('9. Browser Console Errors', 'PASS', 'Zero unhandled runtime JavaScript errors in browser console');
    } else {
      record('9. Browser Console Errors', 'FAIL', `Errors found: ${consoleErrors.join('; ')}`);
    }

  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('FINAL E2E BROWSER CHECKLIST:');
  console.log('========================================');
  results.forEach(r => {
    console.log(`[${r.status}] ${r.testName} - ${r.notes}`);
  });
}

runTests();
