import katex from 'katex';
import html2canvas from 'html2canvas';

export default async function latexToPngDataUrl(latex: string): Promise<string> {
  // Create a temporary div
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.fontSize = '32px'; // Increase font size for better quality
  document.body.appendChild(tempDiv);

  try {
    tempDiv.innerHTML = katex.renderToString(latex, { throwOnError: false });
    const canvas = await html2canvas(tempDiv, { backgroundColor: null, scale: 2 }); // scale: 2 for higher res
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (e) {
    return '';
  } finally {
    document.body.removeChild(tempDiv);
  }
} 