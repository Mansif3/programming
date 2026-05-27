import { useState, useEffect } from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon, Clock, Pencil, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  onClear,
  placeholder = "No date set",
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [timeStr, setTimeStr] = useState(() => {
    if (!value) return "00:00";
    const d = new Date(value);
    return isValid(d) ? format(d, "HH:mm") : "00:00";
  });

  // Sync timeStr when value prop changes (e.g. dialog reopens with existing value)
  useEffect(() => {
    if (!value) { setTimeStr("00:00"); return; }
    const d = new Date(value);
    if (isValid(d)) setTimeStr(format(d, "HH:mm"));
  }, [value]);

  const parsed = value ? new Date(value) : undefined;
  const selectedDate = parsed && isValid(parsed) ? parsed : undefined;

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const [h, m] = timeStr.split(":").map(Number);
    day.setHours(h || 0, m || 0, 0, 0);
    onChange(day.toISOString());
  }

  function handleTimeChange(t: string) {
    setTimeStr(t);
    if (!selectedDate) return;
    const [h, m] = t.split(":").map(Number);
    const next = new Date(selectedDate);
    next.setHours(h || 0, m || 0, 0, 0);
    onChange(next.toISOString());
  }

  const dateDisplay = selectedDate ? format(selectedDate, "dd MMM yyyy") : null;
  const timeDisplay = selectedDate ? format(selectedDate, "HH:mm") : null;

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <div className="flex items-center gap-2 min-h-[36px]">
        {selectedDate ? (
          <>
            {/* Date chip */}
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{dateDisplay}</span>
            </div>
            <span className="text-muted-foreground/50 text-xs">·</span>
            {/* Time chip */}
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{timeDisplay}</span>
            </div>
            {/* Edit button */}
            <PopoverTrigger asChild>
              <button
                disabled={disabled}
                className={cn(
                  "ml-0.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                title="Edit date & time"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            {/* Clear button */}
            {onClear && (
              <button
                onClick={onClear}
                disabled={disabled}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                title="Clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          /* No value — show placeholder + set button */
          <PopoverTrigger asChild>
            <button
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{placeholder}</span>
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </PopoverTrigger>
        )}
      </div>

      <PopoverContent className="w-auto p-0 overflow-hidden" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2035}
          initialFocus
        />
        <div className="flex items-center gap-2 px-4 py-3 border-t bg-muted/30">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Time</span>
          <Input
            type="time"
            value={timeStr}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="h-8 w-32 ml-auto text-sm font-mono"
          />
        </div>
        <div className="px-4 pb-3 flex justify-end">
          <Button size="sm" className="h-7 text-xs px-3" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
