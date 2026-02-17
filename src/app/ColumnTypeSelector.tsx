import React from "react";
import type { ColumnType } from "../types";
import { Box, Typography, Paper, TextField, InputAdornment } from "@mui/material";
import Grid from "@mui/material/Grid";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import DateRangeIcon from "@mui/icons-material/DateRange";
import PeopleIcon from "@mui/icons-material/People";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import NumbersIcon from "@mui/icons-material/Numbers";
import TimelineIcon from "@mui/icons-material/Timeline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DescriptionIcon from "@mui/icons-material/Description";
import LinkIcon from "@mui/icons-material/Link";
import FunctionsIcon from "@mui/icons-material/Functions";
import InfoIcon from "@mui/icons-material/Info";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import FlagIcon from '@mui/icons-material/Flag';
import ChatIcon from '@mui/icons-material/Chat';

interface ColumnTypeSelectorProps {
  onSelect: (type: ColumnType, label: string) => void;
}



const columnOptions = [
  { label: "Status", icon: <CheckBoxIcon sx={(theme) => ({ color: theme.palette.success.main })} />, color: '#00c875', type: 'Status' },
  { label: "Text", icon: <TextFieldsIcon sx={{ color: '#579bfc' }} />, color: '#579bfc', type: 'Text' },
  { label: "People", icon: <PeopleIcon sx={{ color: '#a25ddc' }} />, color: '#a25ddc', type: 'People' },
  { label: "Dropdown", icon: <ArrowDropDownCircleIcon sx={{ color: '#ffcb00' }} />, color: '#ffcb00', type: 'Dropdown' },
  { label: "Date", icon: <DateRangeIcon sx={{ color: '#579bfc' }} />, color: '#579bfc', type: 'Date' },
  { label: "Numbers", icon: <NumbersIcon sx={{ color: '#fdab3d' }} />, color: '#fdab3d', type: 'Numbers' },
  { label: "Files", icon: <InsertDriveFileIcon sx={{ color: '#579bfc' }} />, color: '#579bfc', type: 'Files' },
  { label: "monday Doc", icon: <DescriptionIcon sx={{ color: '#a25ddc' }} />, color: '#a25ddc', type: 'Doc' },
  { label: "Connect boards", icon: <LinkIcon sx={{ color: '#579bfc' }} />, color: '#579bfc', type: 'Connect' },
  { label: "Timeline", icon: <TimelineIcon sx={{ color: '#579bfc' }} />, color: '#579bfc', type: 'Timeline' },
  { label: "Checkbox", icon: <CheckBoxIcon sx={{ color: '#00c875' }} />, color: '#00c875', type: 'Checkbox' },
  { label: "Formula", icon: <FunctionsIcon sx={{ color: '#fdab3d' }} />, color: '#fdab3d', type: 'Formula' },
  { label: "Extract info", icon: <InfoIcon sx={{ color: '#579bfc' }} />, color: '#579bfc', type: 'Extract' },
  { label: "Priority", icon: <PriorityHighIcon sx={{ color: '#e2445c' }} />, color: '#e2445c', type: 'Priority' },
  { label: "Country", icon: <FlagIcon sx={{ color: '#1976d2' }} />, color: '#1976d2', type: 'Country' },
  { label: "Message", icon: <ChatIcon sx={{ color: '#fd397a' }} />, color: '#fd397a', type: 'Message' },
];




export default function ColumnTypeSelector({ onSelect }: ColumnTypeSelectorProps) {
  return (
    <Box sx={{ bgcolor: '#23243a', p: { xs: 0.5, sm: 0 }, m: 0, borderRadius: 4, minWidth: 0, minHeight: 0, width: { xs: 220, sm: 'auto' }, maxWidth: { xs: 220, sm: 'none' } }}>
      <Paper elevation={0} sx={{
        p: { xs: 1, sm: 3 },
        width: { xs: 300, sm: 450 },
        borderRadius: 4,
        bgcolor: '#23243a',
        color: '#fff',
        boxShadow: 'none',
        border: 'none',
        m: 0,
        minWidth: 0,
        minHeight: 0
      }}>
      <TextField
        fullWidth
        placeholder="Search or describe your column"
        size="small"
        sx={{ mb: { xs: 1, sm: 2 }, bgcolor: '#2c2d4a', borderRadius: 2, input: { color: '#fff', fontSize: { xs: 13, sm: 16 } } }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#bfc8e0', fontSize: { xs: 13, sm: 16 } }}>🔍</Typography></InputAdornment>,
        }}
      />
      <Typography variant="subtitle2" sx={{ mb: { xs: 0.5, sm: 1 }, mt: { xs: 1, sm: 2 }, color: '#bfc8e0', fontSize: { xs: 13, sm: 16 } }}>
        Essentials
      </Typography>
      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {columnOptions.slice(0, 6).map((opt) => (
          <Grid item xs={4} key={opt.label}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, cursor: 'pointer', p: { xs: 0.5, sm: 1 }, borderRadius: 2, bgcolor: '#23243a', '&:hover': { bgcolor: '#35365a' } }}
              onClick={() => onSelect(opt.type as ColumnType, opt.label)}
            >
              {React.cloneElement(opt.icon, { fontSize: 'small' })}
              <Typography fontWeight={600} sx={{ color: opt.color, fontSize: { xs: 12, sm: 15 } }}>{opt.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography variant="subtitle2" sx={{ mb: { xs: 0.5, sm: 1 }, mt: { xs: 1.5, sm: 3 }, color: '#bfc8e0', fontSize: { xs: 13, sm: 16 } }}>
        Super useful
      </Typography>
      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {columnOptions.slice(6).map((opt) => (
          <Grid item xs={4} key={opt.label}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, cursor: 'pointer', p: { xs: 0.5, sm: 1 }, borderRadius: 2, bgcolor: '#23243a', '&:hover': { bgcolor: '#35365a' } }}
              onClick={() => onSelect(opt.type as ColumnType, opt.label)}
            >
              {React.cloneElement(opt.icon, { fontSize: 'small' })}
              <Typography fontWeight={600} sx={{ color: opt.color, fontSize: { xs: 12, sm: 15 } }}>{opt.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
        <Box sx={{ textAlign: 'center', mt: { xs: 1, sm: 3 } }}>
          <Typography variant="body2" sx={{ cursor: 'pointer', fontWeight: 600, color: '#bfc8e0', fontSize: { xs: 12, sm: 15 } }}>
            More columns
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
