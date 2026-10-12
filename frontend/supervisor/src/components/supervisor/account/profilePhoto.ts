/** Edge of the stored square profile photo, in pixels. Small enough to keep in localStorage. */
const photoSize = 256

/** Crops an uploaded image to a centered square and returns it as a compact JPEG data URL. */
export function resizeProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = photoSize
      canvas.height = photoSize
      const context = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!context) {
        reject(new Error('Canvas is not available.'))
        return
      }
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        photoSize,
        photoSize,
      )
      resolve(canvas.toDataURL('image/jpeg', 0.86))
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The file could not be read as an image.'))
    }

    image.src = url
  })
}
