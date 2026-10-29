"use client";
import React, { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { createTheme } from "@mui/material/styles";
import { Box, Button, Typography } from "@mui/material";
import KanbanVirtualColumn from "../../src/app/KanbanVirtualColumn";

type Task = { id: string; values: Record<string, unknown>; statusColumnId: string };
const theme = createTheme({ palette: { mode: "dark" } });
const makeTasks = (size: number): Task[] => Array.from({ length: size }, (_, i) => ({ id: `task-${i}`, statusColumnId: "status", values: { name: `Task ${i}`, status: i % 5 === 0 ? "Done" : "Todo" } }));

export default function Page() {
  const [size, setSize] = useState(5000);
  const [tasks, setTasks] = useState<Task[]>(() => makeTasks(5000));
  const [lastMove, setLastMove] = useState("none");
  const [events, setEvents] = useState<string[]>([]);
  const columns = useMemo(() => [{ id: "name", type: "Text" }, { id: "status", type: "Status" }], []);
  const byStatus = (status: string) => tasks.filter((task) => task.values.status === status);
  const move = (result: any) => {
    setEvents((current) => [...current, `end:${result.draggableId}:${result.destination?.droppableId || "none"}`].slice(-12));
    if (!result.destination) return;
    const sourceStatus = result.source.droppableId.replace("kanban:", "");
    const destinationStatus = result.destination.droppableId.replace("kanban:", "");
    setTasks((current) => {
      const source = current.filter((task) => task.values.status === sourceStatus);
      const moved = source[result.source.index];
      if (!moved) return current;
      const next = current.filter((task) => task.id !== moved.id).map((task) => task.id === moved.id ? { ...task, values: { ...task.values, status: destinationStatus } } : task);
      const updated = next.find((task) => task.id === moved.id);
      if (!updated) return current;
      const destination = next.filter((task) => task.values.status === destinationStatus).filter((task) => task.id !== moved.id);
      destination.splice(result.destination.index, 0, updated);
      const ids = new Set(destination.map((task) => task.id));
      const rebuilt = [...next.filter((task) => task.values.status !== destinationStatus), ...destination];
      setLastMove(`${moved.id}:${sourceStatus}->${destinationStatus}:${result.destination.index}`);
      return rebuilt.filter((task, index, all) => all.findIndex((candidate) => candidate.id === task.id) === index);
    });
  };
  const dndEvent = (name: string) => (payload?: any) => setEvents((current) => [...current, `${name}:${payload?.destination?.droppableId || payload?.draggingOver || "none"}`].slice(-12));
  const standard = ["standard-0", "standard-1", "standard-2"];
  const renderColumn = (status: string, color: string) => {
    const columnTasks = byStatus(status);
    return <Box key={status} data-testid={`column-${status}`} sx={{ bgcolor: "#191a2a", p: 1, borderRadius: 1 }}>
      <Typography data-testid={`count-${status}`}>{status}: {columnTasks.length}</Typography>
      <KanbanVirtualColumn statusValue={status} statusColumnId="status" tasks={columnTasks} statusColor={color} userPermission="edit" hasActiveFilters={false} theme={theme} tableMemberById={new Map()} columns={columns} kanbanCardColumns={columns} openReviewTask={() => {}} stringToColor={(value) => `#${value.slice(-6).padStart(6, "0")}`} onLoadMore={() => {}} loadError={null} onRetry={() => {}} />
    </Box>;
  };
  return <main><Typography variant="h5" sx={{ p: 2 }}>Phase 3E real component harness</Typography><Box sx={{ px: 2 }}><Button data-testid="size-0" onClick={() => { setTasks([]); setSize(0); }}>0</Button><Button data-testid="size-5000" onClick={() => { setTasks(makeTasks(5000)); setSize(5000); }}>5000</Button><Typography data-testid="dataset-size">dataset={size}</Typography><Typography data-testid="last-move">{lastMove}</Typography><Typography data-testid="dnd-events">{events.join("|")}</Typography></Box><DragDropContext onBeforeCapture={dndEvent("beforeCapture")} onBeforeDragStart={dndEvent("beforeStart")} onDragStart={dndEvent("start")} onDragUpdate={dndEvent("update")} onDragEnd={move}><Box id="standard" sx={{ p: 2 }}><Typography>Standard</Typography><Droppable droppableId="standard" type="standard">{(provided) => <Box ref={provided.innerRef} {...provided.droppableProps}>{standard.map((id, index) => <Draggable key={id} draggableId={id} index={index}>{(p) => <Box ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} data-testid={`standard-card-${id}`} sx={{ p: 1, bgcolor: "#333", width: 180 }}>{id}</Box>}</Draggable>)}{provided.placeholder}</Box>}</Droppable></Box><Box id="board">{renderColumn("Todo", "#1976d2")}{renderColumn("Done", "#00c875")}</Box></DragDropContext></main>;
}
