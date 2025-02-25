import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Copy, ChevronRight, ChevronDown } from "lucide-react";

interface JsonPathViewerProps {
  data: any;
  path?: string;
  level?: number;
}

const getValueColor = (value: any) => {
  if (typeof value === 'string') return 'text-green-600';
  if (typeof value === 'number') return 'text-blue-600';
  if (typeof value === 'boolean') return 'text-purple-600';
  if (value === null) return 'text-gray-500';
  return '';
};

const JsonPathViewer: React.FC<JsonPathViewerProps> = ({ data, path = '', level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (typeof data !== 'object' || data === null) {
    return (
      <span className={`${getValueColor(data)} font-mono`}>
        {JSON.stringify(data)}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="pl-4 font-mono">
      <div className="flex items-center gap-2">
        <button onClick={toggleExpand} className="hover:bg-muted rounded p-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <span>{isArray ? '[' : '{'}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="cursor-pointer text-xs"
                onClick={() => handleCopy(path)}
              >
                {path || 'root'}
                <Copy className="ml-1 h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to copy JSON path</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {isExpanded && (
        <div className="pl-4">
          {Object.entries(data).map(([key, value], index) => (
            <div key={key} className="py-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-800 font-semibold">
                  {isArray ? index : `"${key}"`}
                </span>
                <span>:</span>
                <JsonPathViewer 
                  data={value} 
                  path={path ? `${path}.${key}` : key}
                  level={level + 1}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="pl-4">
        <span>{isArray ? ']' : '}'}</span>
      </div>
    </div>
  );
};

export default JsonPathViewer;
