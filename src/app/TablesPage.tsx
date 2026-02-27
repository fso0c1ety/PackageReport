"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl, authenticatedFetch } from "./apiUrl";
import { Box, Typography, Paper, Tabs, Tab } from "@mui/material";
import TableManager from "./TableManager";
import { TodoList } from "./TodoList";
import { Column, Row, Table } from "../types";



export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selected, setSelected] = useState(0);

  const fetchTables = async () => {
    const res = await authenticatedFetch(getApiUrl("/tables"));
    const data = await res.json();
    setTables(data);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  return (
    <Box sx={{ width: "100%", mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Tables
        </Typography>
        <TableManager onTableCreated={fetchTables} />
      </Box>
      <Paper>
        <Tabs
          value={selected}
          onChange={(_, v) => setSelected(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tables.map((table) => (
            <Tab key={table.id} label={table.name} />
          ))}
        </Tabs>
        {tables[selected] && (
          <TodoList
            columns={tables[selected].columns}
            tableId={tables[selected].id}
          />
        )}
      </Paper>
    </Box>
  );
}
