// Privacy-Preserving Midnight Donation Header Component
import React from 'react';
import { AppBar, Box, Typography, Chip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export const Header: React.FC = () => (
  <AppBar
    position="static"
    data-testid="header"
    sx={{
      backgroundColor: '#0a0a14',
      borderBottom: '1px solid rgba(138, 43, 226, 0.3)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: { xs: 2, md: 6 },
      py: 1.5,
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
      data-testid="header-logo"
    >
      <img src="/midnight-logo.png" alt="Midnight Logo" height={45} />
      <Box>
        <Typography variant="h6" sx={{ color: '#fff', lineHeight: 1.2, fontWeight: 'bold' }}>
          Midnight Donation DApp
        </Typography>
        <Typography variant="caption" sx={{ color: '#00e5ff' }}>
          Rise In Level 1 Challenge • Privacy-Preserving Crowdfunding
        </Typography>
      </Box>
    </Box>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={<LockIcon style={{ color: '#00e5ff', fontSize: 16 }} />}
        label="Midnight Preprod ZK Network"
        variant="outlined"
        sx={{
          color: '#b388ff',
          borderColor: 'rgba(138, 43, 226, 0.5)',
          backgroundColor: 'rgba(138, 43, 226, 0.1)',
          fontWeight: 'bold',
        }}
      />
    </Box>
  </AppBar>
);
