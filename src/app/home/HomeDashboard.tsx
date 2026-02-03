"use client";
// HomeDashboard: Styled dashboard matching screenshot, with user's name and data
import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';

// Example data (replace with your actual data)
const userName = 'Your Name';
const workspaces = [
  { name: 'Main workspace', type: 'work management' },
  { name: 'Dashboard and reporting', type: 'reporting' },
  { name: 'Name of the Group', type: 'group' },
];
const recentlyVisited = [
  { title: 'Dashboard and reporting', group: 'Main workspace', img: '/dashboard.svg' },
];

const Root = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  background: '#23243a',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  overflowX: 'hidden',
}));
const Sidebar = styled(Box)(({ theme }) => ({
  width: 240,
  background: '#18192b',
  padding: '24px 0',
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #2c2d4a',
}));
const Main = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  background: '#23243a',
  color: '#fff',
}));
const RightSidebar = styled(Box)(({ theme }) => ({
  width: 320,
  background: '#23243a',
  padding: '32px 16px',
  borderLeft: '1px solid #35365a',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
}));
const Section = styled(Box)(({ theme }) => ({
  marginBottom: 32,
}));
const WorkspaceCard = styled(Card)(({ theme }) => ({
  background: '#2c2d4a',
  color: '#fff',
  borderRadius: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  marginBottom: 16,
  border: '1.5px solid #35365a',
}));
const BoardPreview = styled(Box)(({ theme }) => ({
  height: 120,
  background: '#35365a',
  borderRadius: 12,
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

export default function HomeDashboard() {
  const [automationUpdates, setAutomationUpdates] = useState<any[]>([]);
  const [transportiTask, setTransportiTask] = useState(null);
  const [transportiRecipients, setTransportiRecipients] = useState([]);
  const [transportiCols, setTransportiCols] = useState<string[]>([]);

  useEffect(() => {
        // Find selected columns for Transporti from automation.json
        fetch('/api/automation')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              const automation = data.find(a => a.tableId === 'ca9b23aa-1158-4d78-97ef-4c2caa04e20b');
              if (automation && Array.isArray(automation.cols)) {
                setTransportiCols(automation.cols);
              }
            }
          });
    function fetchUpdates() {
      fetch('/api/automation')
        .then(res => res.json())
        .then(data => setAutomationUpdates(Array.isArray(data) ? data : []));

      fetch('/api/transporti')
        .then(res => res.json())
        .then(data => {
          if (data) {
            setTransportiTask(data);
            setTransportiRecipients(data.recipients || []);
          }
        });
    }
    fetchUpdates();
    const interval = setInterval(fetchUpdates, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch all automations (simulate fetching all tables)
    fetch('/api/automation')
      .then(res => res.json())
      .then(data => setAutomationUpdates(Array.isArray(data) ? data : []));
  }, []);

  return (
    <Root>
      {/* Sidebar removed as requested */}
      <Main>
        <Section>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Recently visited</Typography>
          <Box display="flex" gap={2}>
            {/* Other recent buttons from recentlyVisited array */}
            {recentlyVisited.map((item, i) => (
              <WorkspaceCard
                key={item.title}
                sx={{ width: 220, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px #4f51c0' } }}
                onClick={() => {
                  // Use Next.js dynamic route for group pages
                  window.location.href = `/home/group/${encodeURIComponent(item.title)}`;
                }}
              >
                <BoardPreview>
                  <img src={item.img} alt={item.title} style={{ width: '80%', borderRadius: 8, background: '#CBDDFF' }} />
                </BoardPreview>
                <CardContent>
                  <Typography fontWeight={600}>{item.title}</Typography>
                  <Typography variant="caption" color="#aaa">{item.group}</Typography>
                </CardContent>
              </WorkspaceCard>
            ))}
            {/* Transporti button */}
            <WorkspaceCard
              sx={{ width: 220, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px #4f51c0' } }}
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <BoardPreview>
                <img src="/Group.svg" alt="Transporti" style={{ width: '80%', borderRadius: 8, background: '#CBDDFF' }} />
              </BoardPreview>
              <CardContent>
                <Typography fontWeight={600}>Transporti</Typography>
                <Typography variant="caption" color="#aaa">Recent Work</Typography>
              </CardContent>
            </WorkspaceCard>
          </Box>
        </Section>
        <Section>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Update feed (Inbox)</Typography>
          <Box bgcolor="#2c2d4a" borderRadius={2} p={2} color="#aaa">
            {transportiTask ? (
              <List>
                <ListItem alignItems="flex-start" sx={{ borderBottom: '1px solid #35365a', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Avatar sx={{ bgcolor: '#4f51c0' }}>T</Avatar>
                    <Typography fontWeight={600} color="#fff">{transportiRecipients.join(', ')}</Typography>
                  </Box>
                  <Typography fontWeight={600} color="#4f51c0" mb={0.5}>Subject: Task Update for Transporti</Typography>
                  <Typography variant="body2" color="#bfc8e0" mb={0.5}>
                    Hello,<br />
                    There was an update in <b>Transporti</b>.<br />
                    {transportiCols.map(colId => {
                      const value = transportiTask[colId];
                      // Map column id to name for display
                      const colNames: Record<string, string> = {
                        'task': 'Importusi',
                        '4c1c4531-b849-4281-9e10-be8db8e114fa': 'Exportusi',
                        '83dabc09-ba5a-4e4b-84f4-e3892536aa8d': 'Statusi',
                        '8f908cb4-1920-4f33-9b85-147522d74393': 'Kg',
                        '7299f9c0-38d7-4da7-b919-860fdab3d1a5': 'Shteti',
                        '6fedd67e-e350-44b2-9315-9eaca2a349ff': 'Date',
                        'status': 'Statusi',
                        'number': 'Kg'
                      };
                      if (value !== undefined) {
                        return (
                          <span key={colId}>{colNames[colId] || colId}: "{value}"<br /></span>
                        );
                      }
                      return null;
                    })}
                    <br />
                    You are receiving this notification because you are listed as a recipient for updates on this table.
                  </Typography>
                </ListItem>
              </List>
            ) : (
              <Typography>No new updates</Typography>
            )}
          </Box>
        </Section>
        <Section>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>My workspaces</Typography>
          <WorkspaceCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#4f51c0', width: 48, height: 48 }}>M</Avatar>
                <Box>
                  <Typography fontWeight={600}>Main workspace</Typography>
                  <Typography variant="caption" color="#aaa">work management</Typography>
                </Box>
              </Box>
            </CardContent>
          </WorkspaceCard>
        </Section>
      </Main>
      <RightSidebar>
        <Box bgcolor="#2c2d4a" borderRadius={2} p={2} border="1.5px solid #35365a">
          <Typography fontWeight={600} mb={1} color="#fff">Boost your workflow in minutes with ready-made templates</Typography>
          <Button variant="contained" sx={{ bgcolor: '#4f51c0', borderRadius: 2, mt: 1, color: '#fff' }}>Explore templates</Button>
        </Box>
        <Box bgcolor="#2c2d4a" borderRadius={2} p={2} border="1.5px solid #35365a">
          <Typography fontWeight={600} mb={1} color="#fff">Getting started</Typography>
          <Typography variant="body2" color="#bfc8e0">Learn how your app works</Typography>
        </Box>
        <Box bgcolor="#2c2d4a" borderRadius={2} p={2} border="1.5px solid #35365a">
          <Typography fontWeight={600} mb={1} color="#fff">Help center</Typography>
          <Typography variant="body2" color="#bfc8e0">Learn and get support</Typography>
        </Box>
      </RightSidebar>
    </Root>
  );
}
