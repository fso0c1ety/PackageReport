import Box from '@mui/material/Box';

export default function HomePage() {
  return (
    <Box
      sx={{
        width: { xs: '98vw', sm: '90vw', md: '80vw', lg: '70vw' },
        maxWidth: 1100,
        minHeight: 200,
        maxHeight: 'calc(100vh - 140px)',
        bgcolor: '#fff',
        borderRadius: 3,
        boxShadow: 1,
        m: 'auto',
        mt: 3,
        mb: 3,
        p: { xs: 1, sm: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
    </Box>
  );
}
