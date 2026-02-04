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
  borderRadius: 20,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  marginBottom: 24,
  border: '2px solid #4f51c0',
  width: '32vw',
  minWidth: 260,
  maxWidth: 400,
  minHeight: '18vw',
  maxHeight: 260,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px 0',
  [theme.breakpoints.down('sm')]: {
    width: '80vw',
    minWidth: 180,
    maxWidth: 320,
    minHeight: '28vw',
    maxHeight: 180,
    padding: '12px 0',
  },
}));
const BoardPreview = styled(Box)(({ theme }) => ({
  height: '12vw',
  minHeight: 100,
  maxHeight: 180,
  background: '#35365a',
  borderRadius: 20,
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '95%',
  [theme.breakpoints.down('sm')]: {
    height: '24vw',
    minHeight: 60,
    maxHeight: 120,
    marginBottom: 10,
  },
}));

export default function HomeDashboard() {
  const [emailUpdates, setEmailUpdates] = useState<any[]>([]);

  useEffect(() => {
    function fetchEmailUpdates() {
      fetch('http://localhost:4000/api/email-updates')
        .then(res => res.json())
        .then(data => setEmailUpdates(Array.isArray(data) ? data.reverse() : [])); // newest first
    }
    fetchEmailUpdates();
    const interval = setInterval(fetchEmailUpdates, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  // ...existing code...

  return (
    <Root>
      {/* Sidebar removed as requested */}
      <Main>
        <Section>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Recently visited</Typography>
          <Box display="flex" gap={4} flexWrap="wrap" justifyContent="flex-start" alignItems="stretch" minHeight={280}>
            {/* Other recent buttons from recentlyVisited array */}
            {recentlyVisited.map((item, i) => (
              <WorkspaceCard
                key={item.title}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 4px 16px #4f51c0' },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1
                }}
                onClick={() => {
                  if (item.title === 'Dashboard and reporting') {
                    window.location.href = '/dashboard';
                  } else {
                    window.location.href = `/home/group/${encodeURIComponent(item.title)}`;
                  }
                }}
              >
                <BoardPreview sx={{ height: '12vw', minHeight: 100, maxHeight: 180, width: '95%', mb: 0 }}>
                  <img src={item.img} alt={item.title} style={{ width: '100%', height: '100%', borderRadius: 20, background: '#CBDDFF', objectFit: 'cover' }} />
                </BoardPreview>
                <CardContent sx={{ textAlign: 'center', px: 0 }}>
                  <Typography fontWeight={800} fontSize={16} mb={0.5}>{item.title}</Typography>
                  <Typography variant="caption" color="#aaa" fontSize={12}>{item.group}</Typography>
                </CardContent>
              </WorkspaceCard>
            ))}
            {/* Transporti button */}
            <WorkspaceCard
              sx={{ width: 400, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px #4f51c0' } }}
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <BoardPreview sx={{ height: '12vw', minHeight: 100, maxHeight: 180, width: '95%', mb: 0 }}>
                <img src="/Group.svg" alt="Transporti" style={{ width: '100%', height: '100%', borderRadius: 20, background: '#CBDDFF', objectFit: 'cover' }} />
              </BoardPreview>
              <CardContent sx={{ textAlign: 'center', px: 0 }}>
                <Typography fontWeight={700} fontSize={22}>Transporti</Typography>
                <Typography variant="caption" color="#aaa" fontSize={16}>Recent Work</Typography>
              </CardContent>
            </WorkspaceCard>
          </Box>
        </Section>
        <Section>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Update feed (Inbox)</Typography>
          <Box bgcolor="#2c2d4a" borderRadius={2} p={2} color="#aaa">
            {emailUpdates.length > 0 ? (
              <List>
                {emailUpdates.map((update, idx) => (
                  <ListItem key={idx} alignItems="flex-start" sx={{ borderBottom: '1px solid #35365a', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Avatar sx={{ bgcolor: '#4f51c0' }}>{update.tableId ? update.tableId[0].toUpperCase() : 'T'}</Avatar>
                      <Typography fontWeight={600} color="#fff">{update.recipients.join(', ')}</Typography>
                    </Box>
                    <Typography fontWeight={600} color="#4f51c0" mb={0.5}>{update.subject}</Typography>
                    <Typography variant="body2" color="#bfc8e0" mb={0.5}>
                      <span dangerouslySetInnerHTML={{ __html: update.html }} />
                      <br />
                      <span style={{ fontSize: '0.9em', color: '#888' }}>Sent: {new Date(update.timestamp).toLocaleString()}</span>
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No new updates</Typography>
            )}
          </Box>
        </Section>
        <Section>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>My workspaces</Typography>
          <WorkspaceCard
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1
            }}
          >
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
