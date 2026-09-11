import React from 'react';
import { Search } from 'lucide-react';
import { TextInput, TextInputProps } from './TextInput';

export interface SearchInputProps extends Omit<TextInputProps, 'prefix'> {
  shortcutHint?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ shortcutHint, suffix, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        type="search"
        prefix={<Search className="w-3.5 h-3.5" />}
        suffix={
          suffix ||
          (shortcutHint ? (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-ink-tertiary bg-surface-container border border-hairline rounded-xs select-none">
              {shortcutHint}
            </kbd>
          ) : undefined)
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
