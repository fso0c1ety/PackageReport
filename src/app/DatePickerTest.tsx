"use client";
import * as React from "react";
import { Box, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

export default function DatePickerTest() {
  const [value, setValue] = React.useState(null);
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 4, bgcolor: "#222", color: "#fff", minHeight: 300 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          MUI DatePicker Test
        </Typography>
        <DatePicker
          value={value}
          onChange={setValue}
          slotProps={{
            textField: {
              size: "small",
              autoFocus: true,
              InputProps: { style: { color: "#fff" } },
              sx: { bgcolor: "#333", color: "#fff" },
            },
          }}
        />
        <Typography sx={{ mt: 2 }}>Selected: {value ? dayjs(value).format("YYYY-MM-DD") : "None"}</Typography>
      </Box>
    </LocalizationProvider>
  );
}
