
import type { ColumnType } from "../types";
import { Box, Typography, Grid, Paper, TextField, InputAdornment } from "@mui/material";
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
];




export default function ColumnTypeSelector({ onSelect }: ColumnTypeSelectorProps) {
  return (
    <Paper elevation={3} sx={{ p: 3, width: 420, borderRadius: 4 }}>
      <TextField
        fullWidth
        placeholder="Search or describe your column"
        size="small"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
        }}
      />
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 2 }}>
        Essentials
      </Typography>
      <Grid container spacing={2}>
        {columnOptions.slice(0, 6).map((opt) => (
          <Grid item xs={4} key={opt.label}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', p: 1, borderRadius: 2, '&:hover': { bgcolor: '#f6f7fb' } }}
              onClick={() => onSelect(opt.type as ColumnType, opt.label)}
            >
              {opt.icon}
              <Typography fontWeight={600} color={opt.color}>{opt.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 3 }}>
        Super useful
      </Typography>
      <Grid container spacing={2}>
        {columnOptions.slice(6).map((opt) => (
          <Grid item xs={4} key={opt.label}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', p: 1, borderRadius: 2, '&:hover': { bgcolor: '#f6f7fb' } }}
              onClick={() => onSelect(opt.type as ColumnType, opt.label)}
            >
              {opt.icon}
              <Typography fontWeight={600} color={opt.color}>{opt.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', fontWeight: 600 }}>
          More columns
        </Typography>
      </Box>
    </Paper>
  );
}
