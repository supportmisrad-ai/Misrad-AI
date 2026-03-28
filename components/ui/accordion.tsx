import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const Accordion = ({ children, type = 'single', collapsible = false, defaultValue, value, onValueChange }: { 
  children: React.ReactNode; 
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) => {
  const [internalValue, setInternalValue] = React.useState<string>(value || defaultValue || '');
  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    let finalValue = newValue;
    if (type === 'single' && collapsible && currentValue === newValue) {
      finalValue = '';
    }
    
    if (value === undefined) {
      setInternalValue(finalValue);
    }
    onValueChange?.(finalValue);
  };

  return (
    <AccordionContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className="w-full">{children}</div>
    </AccordionContext.Provider>
  );
};

const AccordionContext = React.createContext<{ value: string; onValueChange: (value: string) => void } | null>(null);

const useAccordion = () => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
};

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('border-b border-slate-200', className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { value });
        }
        return child;
      })}
    </div>
  );
});
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ className, children, value, ...props }, ref) => {
  const { value: activeValue, onValueChange } = useAccordion();
  const isOpen = activeValue === value;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => value && onValueChange(value)}
      className={cn(
        'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  );
});
AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, children, value, ...props }, ref) => {
  const { value: activeValue } = useAccordion();
  const isOpen = activeValue === value;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn('overflow-hidden text-sm transition-all pb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
