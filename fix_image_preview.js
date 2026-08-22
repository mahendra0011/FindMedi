const fs = require('fs');

function moveImagePreview(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the exact block we want to match using regex to avoid whitespace issues
  // We want to find `<div className="bg-muted/50 p-1.5... transition-all">`
  // And the `{selectedImage && (...)}` block inside it.
  
  const pattern = /(<div className="bg-muted\/50 p-1\.5[^>]+>)\s*(\{selectedImage && \(\s*<div className="relative inline-block mb-2 ml-4 mt-2 self-start">\s*<img src=\{selectedImage\} alt="Preview" className="h-16 w-16 object-cover rounded-xl border shadow-sm" \/>\s*<button onClick=\{\(\) => setSelectedImage\(null\)\} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">\s*<X className="w-3 h-3" \/>\s*<\/button>\s*<\/div>\s*\)\})\s*(<div className="flex items-center gap-2">)/;
  
  if (pattern.test(content)) {
    content = content.replace(pattern, (match, divPill, imageBlock, innerDiv) => {
      // Modify the imageBlock to use the new classes
      const newImageBlock = imageBlock
        .replace('mb-2 ml-4 mt-2 self-start', 'mb-3 ml-2');
        
      return `${newImageBlock}\n              ${divPill}\n                ${innerDiv}`;
    });
    
    // We also need to fix the closing div because we took the image block OUT, but wait, 
    // we just swapped their order, we didn't add a new wrapping div. 
    // BUT the old structure was:
    // <div rounded-pill>
    //   {imageBlock}
    //   <div flex row items-center>
    //     input...
    //   </div>
    // </div>
    // The new structure:
    // {imageBlock}
    // <div rounded-pill flex row items-center>
    //   input...
    
    // So we don't need the inner `<div flex row items-center>` anymore!
    // Let's modify the regex to just absorb the inner div completely.
  }
}

function fullFix(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We'll just replace the whole section starting from `<div className="max-w-4xl mx-auto">` or similar
    // We will do string manipulation.
    
    const startPattern = `<div className="bg-muted/50 p-1.5 rounded-3xl border shadow-sm focus-within:ring-2`;
    let startIndex = content.indexOf(startPattern);
    if (startIndex === -1) {
      startIndex = content.indexOf(`<div className="bg-muted/50 p-1.5 rounded-3xl border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">`);
    }
    
    if (startIndex !== -1) {
        // Find the inner flex div
        const innerFlexIndex = content.indexOf('<div className="flex items-center gap-2">', startIndex);
        if (innerFlexIndex !== -1) {
            // Find the end of the input block
            const endButtonIndex = content.indexOf('</Button>', innerFlexIndex) + '</Button>'.length;
            const closingDiv1 = content.indexOf('</div>', endButtonIndex) + '</div>'.length;
            const closingDiv2 = content.indexOf('</div>', closingDiv1) + '</div>'.length;
            
            // The old block
            const oldBlock = content.substring(startIndex, closingDiv2);
            
            // Reconstruct new block without the extra wrapping
            const imagePreviewHTML = `              {selectedImage && (
                <div className="relative inline-block mb-3 ml-2">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border shadow-sm" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}`;
              
            const inputElementsStr = content.substring(innerFlexIndex + '<div className="flex items-center gap-2">'.length, closingDiv1 - '</div>'.length);
            
            const newBlock = `${imagePreviewHTML}
              <div className="bg-muted/50 p-1.5 rounded-3xl border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all flex items-center gap-2">${inputElementsStr}</div>`;
              
            content = content.replace(oldBlock, newBlock);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    }
}

fullFix('client/src/pages/AIChatPage.jsx');
fullFix('client/src/components/AIChatAssistant.jsx');
