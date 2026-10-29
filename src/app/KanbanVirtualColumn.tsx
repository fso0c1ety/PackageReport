"use client";

import React, { useMemo, useRef } from "react";
import { Box, Button } from "@mui/material";
import { Droppable as DndDroppable, Draggable as DndDraggable } from "@hello-pangea/dnd";
import { useVirtualizer } from "@tanstack/react-virtual";
import KanbanTaskCard from "./KanbanTaskCard";

type Props = {
  statusValue: string;
  tasks: readonly any[];
  statusColor: string;
  statusColumnId: string;
  userPermission: string;
  hasActiveFilters: boolean;
  theme: any;
  tableMemberById: Map<string, any>;
  columns: any[];
  kanbanCardColumns: any[];
  openReviewTask: (task: any) => void;
  stringToColor: (value: string) => string;
  onLoadMore: () => void;
  loadError: string | null;
  onRetry: () => void;
};

export default function KanbanVirtualColumn({
  statusValue, tasks, statusColor, statusColumnId, userPermission, hasActiveFilters,
  theme, tableMemberById, columns, kanbanCardColumns, openReviewTask, stringToColor,
  onLoadMore, loadError, onRetry,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 88,
    overscan: 6,
    getItemKey: (index) => tasks[index]?.id ?? index,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const taskByIndex = useMemo(() => tasks, [tasks]);

  return (
    <DndDroppable
      droppableId={`kanban:${statusValue}`}
      type="kanban-task"
      mode="virtual"
      isDropDisabled={userPermission === 'read' || hasActiveFilters}
      renderClone={(provided, snapshot, rubric) => {
        const task = taskByIndex[rubric.source.index];
        if (!task) return null;
        return <KanbanTaskCard task={{ ...task, statusColumnId }} provided={provided} snapshot={snapshot} theme={theme} userPermission={userPermission} tableMemberById={tableMemberById} columns={columns} kanbanCardColumns={kanbanCardColumns} statusColor={statusColor} stringToColor={stringToColor} openReviewTask={openReviewTask} />;
      }}
    >
      {(provided, snapshot) => (
        <Box
          ref={(node: HTMLDivElement | null) => { scrollRef.current = node; provided.innerRef(node); }}
          {...provided.droppableProps}
          onScroll={(event) => {
            const target = event.currentTarget;
            if (target.scrollHeight - (target.scrollTop + target.clientHeight) < 180) onLoadMore();
          }}
          sx={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 0, borderRadius: 1.5, bgcolor: snapshot.isDraggingOver ? `${statusColor}14` : 'transparent', '::-webkit-scrollbar': { width: 6 }, '::-webkit-scrollbar-thumb': { background: '#35365a', borderRadius: 3 } }}
        >
          <Box sx={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative', minHeight: tasks.length ? undefined : 48 }}>
            {virtualItems.map((virtualItem) => {
              const task = taskByIndex[virtualItem.index];
              if (!task) return null;
              return (
                <Box key={virtualItem.key} ref={virtualizer.measureElement} data-index={virtualItem.index} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)`, px: 0.25, pb: 0.65 }}>
                  <DndDraggable draggableId={task.id} index={virtualItem.index} isDragDisabled={userPermission === 'read' || hasActiveFilters}>
                    {(providedTask, snapshotTask) => <KanbanTaskCard task={{ ...task, statusColumnId }} provided={providedTask} snapshot={snapshotTask} theme={theme} userPermission={userPermission} tableMemberById={tableMemberById} columns={columns} kanbanCardColumns={kanbanCardColumns} statusColor={statusColor} stringToColor={stringToColor} openReviewTask={openReviewTask} />}
                  </DndDraggable>
                </Box>
              );
            })}
          </Box>
          {loadError && <Box sx={{ px: 0.75, py: 0.5 }}><Box component="span" sx={{ color: theme.palette.error.main, fontSize: '0.75rem' }}>{loadError}</Box><Button size="small" onClick={onRetry}>Retry</Button></Box>}
        </Box>
      )}
    </DndDroppable>
  );
}
