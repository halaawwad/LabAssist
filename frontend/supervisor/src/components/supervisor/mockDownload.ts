/** Generated metadata is explicitly a mock text file, never a pretend PDF/document. */
export function downloadAttachment(name: string, context: string, dataUrl?: string) {
  const url =
    dataUrl ??
    URL.createObjectURL(
      new Blob(
        [
          `LabAssist mock attachment\nOriginal file: ${name}\n${context}\n\nOriginal file content is unavailable in the mock portal.`,
        ],
        { type: 'text/plain;charset=utf-8' },
      ),
    )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = dataUrl ? name : `${name}.mock.txt`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  if (!dataUrl) window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
