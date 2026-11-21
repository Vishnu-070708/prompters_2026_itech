const MAX_WIDTH = 800;
const JPEG_QUALITY = 0.7;

export function compressImageForStorage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected photo could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The selected photo could not be processed.'));
      image.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
