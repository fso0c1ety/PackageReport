"use client";
// HomeDashboard: Styled dashboard matching screenshot, with user's name and data
import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';

// Example data (replace with your actual data)
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
  fontSize: '1.15rem', // Increase base font size for desktop
  [theme.breakpoints.up('md')]: {
    fontSize: '1.25rem', // Even larger on desktop
  },
  [theme.breakpoints.down('sm')]: {
    alignItems: 'center',
    paddingLeft: '6vw',
    paddingRight: '6vw',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '1rem', // Normal size on mobile
  },
}));
const RightSidebar = styled(Box)(({ theme }) => ({
  width: 320,
  background: '#23243a',
  padding: '32px 16px',
  borderLeft: '1px solid #35365a',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    marginRight: 0,
    alignItems: 'flex-start',
    paddingLeft: 0,
    paddingRight: 0,
    width: '100%',
    maxWidth: '100vw',
  },
}));
const Section = styled(Box)(({ theme }) => ({
  marginBottom: 32,
}));
const WorkspaceCard = styled(Card)(({ theme }) => ({
  background: '#2c2d4a',
  color: '#fff',
  borderRadius: 20,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  marginBottom: 16,
  border: '2px solid #4f51c0',
  width: '100%',
  maxWidth: 320,
  minWidth: 120,
  minHeight: 120,
  maxHeight: 180,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '10px 4px',
  boxSizing: 'border-box',
  [theme.breakpoints.down('md')]: {
    maxWidth: 260,
    minWidth: 100,
    minHeight: 90,
    maxHeight: 120,
    padding: '6px 2px',
  },
  [theme.breakpoints.down('sm')]: {
    maxWidth: '90vw',
    minWidth: 80,
    minHeight: 60,
    maxHeight: 90,
    padding: '4px 1px',
  },
}));
const SmallWorkspaceCard = styled(Card)(({ theme }) => ({
  background: '#2c2d4a',
  color: '#fff',
  borderRadius: 20,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  marginBottom: 24,
  border: '2px solid #4f51c0',
  width: '22vw',
  minWidth: 180,
  maxWidth: 260,
  minHeight: '10vw',
  maxHeight: 140,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '10px 0',
  [theme.breakpoints.up('md')]: {
    minHeight: 80,
    maxHeight: 100,
    padding: '6px 0',
  },
  [theme.breakpoints.down('sm')]: {
    width: '90vw',
    minWidth: 120,
    maxWidth: 180,
    minHeight: '18vw',
    maxHeight: 90,
    padding: '6px 0',
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

interface Workspace {
  id: string;
  name: string;
  type?: string;
}

export default function HomeDashboard() {
    const userName = 'Your Name';
    const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
    React.useEffect(() => {
      fetch("http://192.168.0.29:4000/api/workspaces")
        .then((res) => res.json())
        .then(setWorkspaces);
    }, []);
  const [emailUpdates, setEmailUpdates] = useState<any[]>([]);

  useEffect(() => {
    function fetchEmailUpdates() {
      fetch('http://192.168.0.29:4000/api/email-updates')
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
                  <img src={item.img} alt={item.title} style={{ width: '100%', height: '100%', borderRadius: 20, background: '#CBDDFF', objectFit: 'cover', maxHeight: '90px' }} />
                </BoardPreview>
                <CardContent sx={{ textAlign: 'center', px: 0 }}>
                  <Typography fontWeight={600} fontSize={10} mb={0.1}>{item.title}</Typography>
                  <Typography variant="caption" color="#aaa" fontSize={8}>{item.group}</Typography>
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
                <img src="/Group.svg" alt="Transporti" style={{ width: '100%', height: '100%', borderRadius: 20, background: '#CBDDFF', objectFit: 'cover', maxHeight: '90px' }} />
              </BoardPreview>
              <CardContent sx={{ textAlign: 'center', px: 0 }}>
                <Typography fontWeight={600} fontSize={10}>Transporti</Typography>
                <Typography variant="caption" color="#aaa" fontSize={8}>Recent Work</Typography>
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
                  <ListItem key={idx} alignItems="flex-start" sx={{ borderBottom: '1px solid #35365a', flexDirection: 'column', alignItems: 'flex-start', position: 'relative', overflow: 'visible', p: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Avatar sx={{ bgcolor: '#4f51c0', width: 20, height: 20, fontSize: 10 }}>{update.tableId ? update.tableId[0].toUpperCase() : 'T'}</Avatar>
                      <Typography fontWeight={500} color="#fff" sx={{ fontSize: { xs: 11, md: 16 } }}>{update.recipients.join(', ')}</Typography>
                    </Box>
                    <Typography fontWeight={500} color="#4f51c0" mb={0.2} sx={{ fontSize: { xs: 10, md: 15 } }}>{update.subject}</Typography>
                    <Typography variant="body2" color="#bfc8e0" mb={0.2} sx={{ fontSize: { xs: 9, md: 14 } }}>
                      <span dangerouslySetInnerHTML={{ __html: update.html }} />
                      <br />
                      <span style={{ fontSize: '0.7em', color: '#888' }}>Sent: {new Date(update.timestamp).toLocaleString()}</span>
                    </Typography>
                    {/* Fix badge overlap: move badge inside card, top right */}
                    {update.badge && (
                      <Box sx={{ position: 'absolute', top: 2, right: 4, zIndex: 2 }}>
                        {update.badge}
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No new updates</Typography>
            )}
          </Box>
        </Section>
        <Section>
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>My workspaces</Typography>
            <Button
              size="small"
              sx={{ ml: 1, minWidth: 0, p: 0, bgcolor: '#35365a', color: '#fff', borderRadius: 1 }}
              onClick={() => {/* Add workspace logic here or open dialog */}}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" fill="currentColor" />
              </svg>
            </Button>
          </Box>
          <Box
            sx={{
              display: { xs: 'grid', sm: 'flex' },
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'none' },
              gap: { xs: 1.5, sm: 2 },
              flexWrap: { sm: 'wrap' },
              justifyContent: { sm: 'flex-start' },
            }}
          >
            {/* Main workspace card */}
            <SmallWorkspaceCard
              key="main-workspace"
              sx={{
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                width: { xs: '100%', sm: '32%' },
                minWidth: { xs: 120, sm: 180 },
                maxWidth: { xs: 160, sm: 340 },
                '&:hover': { boxShadow: '0 4px 16px #4f51c0' },
                m: { xs: 0, sm: 0 },
              }}
              onClick={() => window.location.href = '/workspaces/5d104efd-9bcf-4d27-b296-7433f7bdb146'}
            >
              <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ bgcolor: '#4f51c0', width: 28, height: 28, fontSize: 16 }}>M</Avatar>
                  <Box>
                    <Typography fontWeight={600} fontSize={13}>Main workspace</Typography>
                    <Typography variant="caption" color="#aaa" fontSize={10}>work management</Typography>
                  </Box>
                </Box>
              </CardContent>
            </SmallWorkspaceCard>
            {/* Other workspaces from API */}
            {workspaces.map((ws, idx) => (
              <SmallWorkspaceCard
                key={ws.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  width: { xs: '100%', sm: '32%' },
                  minWidth: { xs: 120, sm: 180 },
                  maxWidth: { xs: 160, sm: 340 },
                  '&:hover': { boxShadow: '0 4px 16px #4f51c0' },
                  m: { xs: 0, sm: 0 },
                }}
                onClick={() => window.location.href = `/workspaces/${ws.id}`}
              >
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ bgcolor: '#4f51c0', width: 28, height: 28, fontSize: 16 }}>{ws.name.charAt(0).toUpperCase()}</Avatar>
                    <Box>
                      <Typography fontWeight={600} fontSize={13}>{ws.name}</Typography>
                      <Typography variant="caption" color="#aaa" fontSize={10}>{ws.type || ''}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </SmallWorkspaceCard>
            ))}
          </Box>
        </Section>
      </Main>
      <RightSidebar>
        <Box
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
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
        </Box>
      </RightSidebar>
    </Root>
  );
}
