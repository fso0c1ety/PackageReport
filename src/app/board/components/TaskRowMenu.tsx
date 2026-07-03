"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import {
  alpha,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableViewIcon from "@mui/icons-material/TableView";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { Row } from "../../../types";

type TaskRowMenuProps = {
  row: Row;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onDelete: () => void;
  onView: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveTop?: () => void;
  onMoveBottom?: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
};

export default function TaskRowMenu({
  dragHandleProps,
  onDelete,
  onView,
  onMoveUp,
  onMoveDown,
  onMoveTop,
  onMoveBottom,
  onExportPdf,
  onExportExcel,
}: TaskRowMenuProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleView = () => {
    handleClose();
    window.requestAnimationFrame(() => {
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onView();
    });
  };

  const menuSx = {
    color: theme.palette.text.primary,
    py: 1.5,
    px: 2,
    gap: 1.5,
    minHeight: "auto",
    "&:hover": { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary },
  };

  const iconSx = {
    minWidth: 0,
    color: "inherit",
    "& .MuiSvgIcon-root": { fontSize: 20 },
  };

  const textSx = {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "inherit",
  };

  return (
    <>
      <IconButton
        {...dragHandleProps}
        onClick={handleOpen}
        sx={{ color: theme.palette.text.secondary, cursor: "grab", "&:hover": { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{ horizontal: "left", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "top" }}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            boxShadow: theme.shadows[8],
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
            ml: 1,
            overflow: "visible",
            "& .MuiList-root": { py: 1 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, pb: 1.5 }}>
          <Typography variant="overline" sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1, fontSize: "0.7rem" }}>ACTIONS</Typography>
        </Box>

        <MenuItem onClick={handleView} sx={menuSx}>
          <ListItemIcon sx={iconSx}><VisibilityIcon /></ListItemIcon>
          <Typography sx={textSx}>Open Details</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem onClick={() => { handleClose(); if (onMoveUp) onMoveUp(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><ArrowUpwardIcon /></ListItemIcon>
          <Typography sx={textSx}>Move Up</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onMoveDown) onMoveDown(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><ArrowDownwardIcon /></ListItemIcon>
          <Typography sx={textSx}>Move Down</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onMoveTop) onMoveTop(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><VerticalAlignTopIcon /></ListItemIcon>
          <Typography sx={textSx}>Move to Top</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onMoveBottom) onMoveBottom(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><VerticalAlignBottomIcon /></ListItemIcon>
          <Typography sx={textSx}>Move to Bottom</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem onClick={() => { handleClose(); if (onExportPdf) onExportPdf(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><PictureAsPdfIcon /></ListItemIcon>
          <Typography sx={textSx}>Export PDF</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onExportExcel) onExportExcel(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><TableViewIcon /></ListItemIcon>
          <Typography sx={textSx}>Export Excel</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem onClick={() => { handleClose(); onDelete(); }} sx={{
          ...menuSx,
          color: theme.palette.error.main,
          "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main },
        }}>
          <ListItemIcon sx={{ ...iconSx, color: "inherit" }}><DeleteIcon /></ListItemIcon>
          <Typography sx={textSx}>Delete Task</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
