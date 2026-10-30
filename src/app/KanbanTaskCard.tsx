"use client";
/* eslint-disable react-hooks/refs -- hello-pangea/dnd supplies render-time ref/prop descriptors. */

import React from "react";
import { alpha } from "@mui/material/styles";
import { Avatar, Box, Chip, Paper, Tooltip, Typography } from "@mui/material";
import DateRangeIcon from "@mui/icons-material/DateRange";
import Flag from "react-flagkit";
import { getAvatarUrl } from "./apiUrl";
import { countryCodeMap } from "./board/constants/countryConstants";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getKanbanTaskTitle } = require("./board/kanbanTaskTitle.cjs");

export type KanbanTaskCardProps = {
  task: any;
  provided: any;
  snapshot: any;
  theme: any;
  userPermission: string;
  tableMemberById: Map<string, any>;
  columns: readonly any[];
  kanbanCardColumns: readonly any[];
  statusColor: string;
  stringToColor: (value: string) => string;
  openReviewTask: (task: any) => void;
};

export default function KanbanTaskCard({
  task,
  provided,
  snapshot,
  theme,
  userPermission,
  tableMemberById,
  columns,
  kanbanCardColumns,
  statusColor,
  stringToColor,
  openReviewTask,
}: KanbanTaskCardProps) {
  const taskStatusValue = task.values?.[task.statusColumnId];
  const taskStatusColor = taskStatusValue ? (task.statusColors?.[taskStatusValue] || statusColor) : statusColor;
  const creator = task.created_by ? tableMemberById.get(task.created_by) : undefined;

  return (
    <Paper
      data-testid={`kanban-card-${task.id}`}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={provided.draggableProps.style}
      elevation={0}
      sx={{
        bgcolor: alpha(taskStatusColor, theme.palette.mode === 'dark' ? 0.18 : 0.1),
        px: 1.25,
        py: 1,
        minHeight: 64,
        borderRadius: 1.25,
        cursor: userPermission === 'read' ? 'default' : (snapshot.isDragging ? 'grabbing' : 'grab'),
        transition: snapshot.isDragging ? 'none' : 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        border: `1px solid ${alpha(taskStatusColor, 0.35)}`,
        borderLeft: `3px solid ${taskStatusColor}`,
        position: 'relative',
        boxShadow: snapshot.isDragging ? `0 10px 24px ${alpha(taskStatusColor, 0.35)}` : 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          borderColor: alpha(taskStatusColor, 0.55),
        },
      }}
      onClick={() => openReviewTask(task)}
    >
      {creator && (
        <Tooltip title={`Created by ${creator.name}`}>
          <Avatar
            src={getAvatarUrl(creator.avatar, creator.name)}
            sx={{ width: 18, height: 18, position: 'absolute', top: 6, right: 6, fontSize: '0.6rem', fontWeight: 'bold', bgcolor: stringToColor(task.created_by), border: `2px solid ${theme.palette.background.default}`, zIndex: 2 }}
          >
            {creator.name ? creator.name.charAt(0).toUpperCase() : '?'}
          </Avatar>
        </Tooltip>
      )}
      <Typography noWrap sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.55, lineHeight: 1.25, pr: 2.5, fontSize: '0.82rem' }}>
        {columns[0] ? getKanbanTaskTitle(task.values?.[columns[0].id]) : 'Untitled'}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 16 }}>
        {kanbanCardColumns.map((col: any) => {
          const rawVal = task.values?.[col.id];
          if (!rawVal) return null;
          if (col.type === 'People' && Array.isArray(rawVal)) {
            return <Box key={col.id} sx={{ display: 'flex', '& > *': { ml: -0.5 }, pl: 0.5 }}>
              {rawVal.slice(0, 3).map((p: any, i: number) => <Tooltip key={i} title={p.name || p.email}>
                <Avatar src={getAvatarUrl(p.avatar, p.name)} sx={{ width: 22, height: 22, border: `2px solid ${theme.palette.background.default}`, fontSize: '0.6rem', bgcolor: '#3d3e5a' }}>{p.name?.[0] || p.email?.[0] || '?'}</Avatar>
              </Tooltip>)}
            </Box>;
          }
          if (col.type === 'Priority') {
            const prioColor = rawVal === 'High' ? '#e2445c' : rawVal === 'Medium' ? '#fdab3d' : '#00c875';
            return <Chip key={col.id} label={String(rawVal)} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${prioColor}33`, color: prioColor, border: `1px solid ${prioColor}44` }} />;
          }
          if (col.type === 'Country' && countryCodeMap[String(rawVal)]) {
            return <Tooltip key={col.id} title={String(rawVal)}><Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}><Flag country={countryCodeMap[String(rawVal)]} size={14} /></Box></Tooltip>;
          }
          if (['Date', 'Text'].includes(col.type)) {
            return <Typography key={col.id} variant="caption" noWrap sx={{ color: theme.palette.text.secondary, fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 0.4, maxWidth: '100%' }}>
              {col.type === 'Date' && <DateRangeIcon sx={{ fontSize: 12 }} />}{String(rawVal)}
            </Typography>;
          }
          return null;
        })}
      </Box>
    </Paper>
  );
}
