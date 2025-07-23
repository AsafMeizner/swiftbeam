export async function UploadFile({ file }: { file: File }): Promise<{ file_url: string }> {
  // For demo purposes we create an object URL
  // In a real app, you'd POST to your backend or S3, etc.
  const file_url = URL.createObjectURL(file);
  return { file_url };
}
