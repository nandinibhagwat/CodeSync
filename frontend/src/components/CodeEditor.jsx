import React from 'react'
import { Suspense } from 'react';
import PageLoader from './PageLoader';

//Lazy load MonacoEditor
const MonacoEditor=React.lazy(()=>import("@monaco-editor/react"));

const CodeEditor = ({language="javascript", code, setCode}) => {
  return (
    <Suspense fallback={<PageLoader />}>
      <div className="border rounded-lg overflow-hidden shadow">
        <MonacoEditor
          height="500px"
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={(value) => setCode(value)}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </Suspense>
  )
}

export default CodeEditor
