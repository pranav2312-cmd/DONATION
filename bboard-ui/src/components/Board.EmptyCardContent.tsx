// Privacy-Preserving Midnight Donation Empty Card Component
import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CardActions, CardContent, IconButton, Tooltip, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import AddCircleIcon from '@mui/icons-material/AddCircleOutlined';
import LinkIcon from '@mui/icons-material/AddLinkOutlined';
import { TextPromptDialog } from './TextPromptDialog';

export interface EmptyCardContentProps {
  onCreateBoardCallback: () => void;
  onJoinBoardCallback: (contractAddress: ContractAddress) => void;
}

export const EmptyCardContent: React.FC<Readonly<EmptyCardContentProps>> = ({
  onCreateBoardCallback,
  onJoinBoardCallback,
}) => {
  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <React.Fragment>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography align="center" variant="h2" color="primary.main" sx={{ mb: 2 }}>
          <VolunteerActivismIcon fontSize="large" sx={{ fontSize: 60, color: '#8a2be2' }} />
        </Typography>
        <Typography data-testid="board-posted-message" align="center" variant="body1" sx={{ color: '#aaa' }}>
          Create a new Privacy Donation Campaign, or join an existing contract...
        </Typography>
      </CardContent>
      <CardActions disableSpacing sx={{ justifyContent: 'center', pb: 3 }}>
        <Tooltip title="Create new Campaign">
          <IconButton data-testid="board-deploy-btn" onClick={onCreateBoardCallback} sx={{ color: '#8a2be2' }}>
            <AddCircleIcon fontSize="large" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Join existing Campaign address">
          <IconButton
            data-testid="board-join-btn"
            onClick={() => {
              setTextPromptOpen(true);
            }}
            sx={{ color: '#00e5ff' }}
          >
            <LinkIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </CardActions>
      <TextPromptDialog
        prompt="Enter contract address (hex)"
        isOpen={textPromptOpen}
        onCancel={() => {
          setTextPromptOpen(false);
        }}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          onJoinBoardCallback(text);
        }}
      />
    </React.Fragment>
  );
};
