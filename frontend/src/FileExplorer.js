import React, { useState } from "react";

function File({ node, onSelectFile }) {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(!open);

  if (node.type === "folder") {
    return (
      <div className="folder">
        <div onClick={toggle} className="folder-name">
          {open ? "📂" : "📁"} {node.name}
        </div>
        {open && (
          <div className="folder-children" style={{ paddingLeft: 20 }}>
            {node.children.map((child, idx) => (
              <File key={idx} node={child} onSelectFile={onSelectFile} />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div className="file" onClick={() => onSelectFile(node.name)}>
        📄 {node.name}
      </div>
    );
  }
}

export default File;
