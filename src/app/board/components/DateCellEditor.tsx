"use client";

import React from "react";
import { TextField } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";

type DateCellEditorProps = {
  initialValue: any;
  onSave: (val: any) => void;
  onCancel?: () => void;
  autoOpenPicker?: boolean;
};

const normalizeDateValue = (value: any) => {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

export default function DateCellEditor({ initialValue, onSave, onCancel, autoOpenPicker = false }: DateCellEditorProps) {
  const theme = useTheme();
  const [value, setValue] = React.useState(() => normalizeDateValue(initialValue));
  const savedValueRef = React.useRef<string | null>(null);
  const skipNextBlurRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const didAutoOpenRef = React.useRef(false);

  const saveValue = React.useCallback((nextValue: string) => {
    if (savedValueRef.current === nextValue) return;
    savedValueRef.current = nextValue;
    onSave(nextValue);
  }, [onSave]);

  React.useEffect(() => {
    if (!autoOpenPicker || didAutoOpenRef.current) return;
    didAutoOpenRef.current = true;

    // Programmatic focus is allowed, but showPicker() must only run directly
    // from a user gesture in Chromium.
    inputRef.current?.focus();
  }, [autoOpenPicker]);

  return (
    <TextField
      type="date"
      size="medium"
      fullWidth
      autoFocus
      inputRef={inputRef}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        skipNextBlurRef.current = false;
        setValue(nextValue);
      }}
      onBlur={() => {
        if (skipNextBlurRef.current) {
          skipNextBlurRef.current = false;
          return;
        }
        saveValue(value);
      }}
      onClick={() => {
        inputRef.current?.showPicker?.();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveValue(value);
        }
        if (event.key === "Tab") {
          saveValue(value);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          skipNextBlurRef.current = true;
          setValue(normalizeDateValue(initialValue));
          onCancel?.();
        }
      }}
      inputProps={{
        "aria-label": "Select date",
      }}
      sx={{
        height: "100%",
        bgcolor: theme.palette.background.paper,
        "& .MuiOutlinedInput-root": {
          height: "100%",
          borderRadius: 1,
        },
        "& .MuiOutlinedInput-input": {
          py: 0.25,
          px: 1.25,
          height: "100%",
          color: theme.palette.text.primary,
          fontSize: "0.95rem",
          fontWeight: 600,
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.divider,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.text.secondary,
        },
        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      }}
    />
  );
}
