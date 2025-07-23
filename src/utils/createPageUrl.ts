export function createPageUrl(name: string): string {
  // Discovery -> /discovery
  return `/${name.toLowerCase()}`;
}
