import React, { useState } from "react";
import type { ColumnType } from "../types";
import { Box, Typography, Paper, InputAdornment, useTheme, Fade, styled } from "@mui/material";
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';

// Essential Icons
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import DateRangeIcon from "@mui/icons-material/DateRange";
import PeopleIcon from "@mui/icons-material/People";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import NumbersIcon from "@mui/icons-material/Numbers";

// Useful Icons
import TimelineIcon from "@mui/icons-material/Timeline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FunctionsIcon from "@mui/icons-material/Functions";
import InfoIcon from "@mui/icons-material/Info";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import FlagIcon from '@mui/icons-material/Flag';

interface ColumnTypeSelectorProps {
  onSelect: (type: ColumnType, label: string) => void;
}

const columnOptions = [
  // Essentials (First 6)
  { label: "Status", icon: <CheckBoxIcon />, color: '#00c875', type: 'Status' },
  { label: "Text", icon: <TextFieldsIcon />, color: '#579bfc', type: 'Text' },
  { label: "People", icon: <PeopleIcon />, color: '#0073ea', type: 'People' },
  { label: "Dropdown", icon: <ArrowDropDownCircleIcon />, color: '#ffcb00', type: 'Dropdown' },
  { label: "Date", icon: <DateRangeIcon />, color: '#00d2d2', type: 'Date' },
  { label: "Numbers", icon: <NumbersIcon />, color: '#fdab3d', type: 'Numbers' },
  // Super useful (Rest)
  { label: "Files", icon: <InsertDriveFileIcon />, color: '#579bfc', type: 'Files' },
  { label: "Timeline", icon: <TimelineIcon />, color: '#ff158a', type: 'Timeline' },
  { label: "Checkbox", icon: <CheckBoxIcon />, color: '#00c875', type: 'Checkbox' },
  { label: "Formula", icon: <FunctionsIcon />, color: '#784bd1', type: 'Formula' },
  { label: "Extract info", icon: <InfoIcon />, color: '#579bfc', type: 'Extract' },
  { label: "Priority", icon: <PriorityHighIcon />, color: '#e2445c', type: 'Priority' },
  { label: "Country", icon: <FlagIcon />, color: '#1976d2', type: 'Country' },
];

const StyledSearchInput = styled(InputBase)(({ theme }) => ({
  color: theme.palette.text.primary,
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(3)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    fontSize: '0.9rem',
  },
}));

export default function ColumnTypeSelector({ onSelect }: ColumnTypeSelectorProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = columnOptions.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const essentials = filteredOptions.filter(opt => columnOptions.indexOf(opt) < 6);
  const superUseful = filteredOptions.filter(opt => columnOptions.indexOf(opt) >= 6);

  const renderOption = (opt: typeof columnOptions[0]) => (
    <Box
      key={opt.label}
      onClick={() => onSelect(opt.type as ColumnType, opt.label)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        cursor: 'pointer',
        p: 2,
        borderRadius: 3,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8f9fa',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#edf1f5'}`,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        '&:hover': {
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
          borderColor: opt.color,
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${opt.color}20`,
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 1.5,
        borderRadius: '50%',
        bgcolor: `${opt.color}15`,
        color: opt.color,
      }}>
        {React.cloneElement(opt.icon, { fontSize: 'medium' })}
      </Box>
      <Typography 
        variant="body2" 
        fontWeight={600} 
        sx={{ 
          color: theme.palette.text.primary,
          fontSize: '0.85rem',
          textAlign: 'center'
        }}
      >
        {opt.label}
      </Typography>
    </Box>
  );

  return (
    <Fade in={true} timeout={300}>
      <Box 
        sx={{
          p: { xs: 2.5, sm: 3 },
          width: '100%',
          bgcolor: 'transparent',
          color: 'text.primary',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%',
        }}
      >
        {/* Header & Search */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: theme.palette.text.primary, display: { xs: 'none', sm: 'block' } }}>
            Add new column
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f4f5f7',
              borderRadius: 2,
              px: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'transparent'}`,
              transition: 'all 0.2s',
              '&:focus-within': {
                borderColor: theme.palette.primary.main,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : '#fff',
                boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
              }
            }}
          >
            <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
            <InputBase
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, py: 1.25, fontSize: '0.95rem' }}
            />
          </Box>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ 
          overflowY: 'auto', 
          flex: 1,
          px: 0.5, 
          pb: 1,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: theme.palette.divider, borderRadius: 3 },
          '&::-webkit-scrollbar-thumb:hover': { background: theme.palette.text.secondary }
        }}>
          
          {essentials.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Essentials
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, 
                gap: 2 
              }}>
                {essentials.map(renderOption)}
              </Box>
            </Box>
          )}

          {superUseful.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Super useful
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, 
                gap: 2 
              }}>
                {superUseful.map(renderOption)}
              </Box>
            </Box>
          )}

          {filteredOptions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, opacity: 0.7 }}>
              <SearchIcon sx={{ fontSize: 40, color: theme.palette.text.secondary, mb: 1 }} />
              <Typography variant="body1" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                No columns found
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Try searching for something else
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
}
