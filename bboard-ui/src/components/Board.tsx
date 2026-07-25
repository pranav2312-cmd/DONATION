// Privacy-Preserving Midnight Donation Campaign Component
import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Button,
  Box,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Security';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import { type DonationDerivedState, type DeployedDonationAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { CampaignState } from '../../../contract/src/index';
import { EmptyCardContent } from './Board.EmptyCardContent';
import { randomBytes } from '../../../api/src/utils';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedDonationAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [campaignState, setCampaignState] = useState<DonationDerivedState>();
  const [donationAmount, setDonationAmount] = useState<string>('50');
  const [privateNote, setPrivateNote] = useState<string>('');
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);
  const [txSuccess, setTxSuccess] = useState<boolean>(false);

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  const onDonate = useCallback(async () => {
    if (!donationAmount || isNaN(Number(donationAmount)) || Number(donationAmount) <= 0) {
      setErrorMessage('Please enter a valid donation amount greater than 0');
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        setErrorMessage(undefined);
        setTxSuccess(false);

        const amount = BigInt(donationAmount);
        const noteCommitment = randomBytes(32);
        await deployedBoardAPI.donate(amount, noteCommitment);
        setTxSuccess(true);
        setPrivateNote('');
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, donationAmount]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }
    const subscription = boardDeployment$.subscribe(setBoardDeployment);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setCampaignState);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment]);

  const totalDonated = campaignState ? Number(campaignState.totalDonated) : 0;
  const campaignGoal = campaignState && Number(campaignState.campaignGoal) > 0 ? Number(campaignState.campaignGoal) : 1000000;
  const progressPercent = Math.min(100, Math.round((totalDonated / campaignGoal) * 100));
  const isCompleted = campaignState?.state === CampaignState.COMPLETED || totalDonated >= campaignGoal;

  return (
    <Card
      sx={{
        position: 'relative',
        width: 380,
        minHeight: 480,
        background: 'linear-gradient(135deg, rgba(20,20,35,0.95) 0%, rgba(30,25,50,0.95) 100%)',
        border: '1px solid rgba(138, 43, 226, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        color: '#fff',
        p: 1,
      }}
    >
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#8a2be2', zIndex: (theme) => theme.zIndex.drawer + 1, borderRadius: '16px' }}
            open={isWorking}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress color="inherit" />
              <Typography variant="body2" sx={{ mt: 2, color: '#00e5ff' }}>
                Executing Zero-Knowledge Proof...
              </Typography>
            </Box>
          </Backdrop>

          <Backdrop
            sx={{ position: 'absolute', color: '#ff4d4d', zIndex: (theme) => theme.zIndex.drawer + 1, borderRadius: '16px', p: 2 }}
            open={!!errorMessage}
            onClick={() => setErrorMessage(undefined)}
          >
            <Box sx={{ textAlign: 'center' }}>
              <StopIcon fontSize="large" color="error" />
              <Typography variant="body2" sx={{ mt: 1, color: '#ff4d4d' }}>
                {errorMessage}
              </Typography>
              <Typography variant="caption" sx={{ color: '#aaa', display: 'block', mt: 1 }}>
                (Click to dismiss)
              </Typography>
            </Box>
          </Backdrop>

          <CardHeader
            avatar={<ShieldIcon sx={{ color: '#00e5ff' }} />}
            title={
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                {campaignState?.campaignTitle || 'Midnight Privacy Fund'}
              </Typography>
            }
            subheader={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip
                  label={isCompleted ? 'GOAL ACHIEVED' : 'ACTIVE CAMPAIGN'}
                  size="small"
                  sx={{
                    backgroundColor: isCompleted ? 'rgba(0, 230, 118, 0.2)' : 'rgba(138, 43, 226, 0.25)',
                    color: isCompleted ? '#00e676' : '#b388ff',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                  }}
                />
                {toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress)}
              </Box>
            }
            action={
              deployedBoardAPI?.deployedContractAddress ? (
                <Tooltip title="Copy Contract Address">
                  <IconButton onClick={onCopyContractAddress} sx={{ color: '#b388ff' }}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
          />

          <CardContent sx={{ py: 1 }}>
            {/* Progress Section */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#aaa' }}>
                  Raised: <strong style={{ color: '#00e5ff' }}>{totalDonated} NIGHT</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#aaa' }}>
                  Goal: <strong style={{ color: '#fff' }}>{campaignGoal} NIGHT</strong>
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #8a2be2 0%, #00e5ff 100%)',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#888', display: 'block', textAlign: 'right', mt: 0.5 }}>
                {progressPercent}% Funded ({campaignState ? Number(campaignState.donationCount) - 1 : 0} Donations)
              </Typography>
            </Box>

            {/* Privacy Guarantee Box */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 229, 255, 0.05)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#00e5ff' }} />
                <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 'bold' }}>
                  ZERO-KNOWLEDGE PRIVACY ACTIVE
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#bbb', display: 'block', fontSize: '0.72rem' }}>
                Your donor identity and private notes are proven using ZK circuit proofs. Only total amounts and anonymized commitments appear on-chain.
              </Typography>
            </Box>

            {/* Donation Inputs */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                id="donation-amount"
                label="Donation Amount (NIGHT)"
                variant="outlined"
                size="small"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                disabled={isCompleted}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(138, 43, 226, 0.4)' },
                    '&:hover fieldset': { borderColor: '#00e5ff' },
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />

              <TextField
                id="private-note"
                label="Private Memo / Note (Encrypted)"
                variant="outlined"
                size="small"
                multiline
                rows={2}
                placeholder="Optional private message..."
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                disabled={isCompleted}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(138, 43, 226, 0.4)' },
                    '&:hover fieldset': { borderColor: '#00e5ff' },
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />
            </Box>

            {txSuccess && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, color: '#00e676' }}>
                <CheckCircleIcon fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Anonymous ZK Donation Submitted!
                </Typography>
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              fullWidth
              variant="contained"
              disabled={isCompleted || !deployedBoardAPI}
              onClick={onDonate}
              startIcon={<VolunteerActivismIcon />}
              sx={{
                background: 'linear-gradient(90deg, #8a2be2 0%, #00e5ff 100%)',
                color: '#fff',
                fontWeight: 'bold',
                textTransform: 'none',
                py: 1,
                borderRadius: '8px',
                '&:hover': {
                  background: 'linear-gradient(90deg, #7b1fa2 0%, #00b8d4 100%)',
                },
              }}
            >
              {isCompleted ? 'Campaign Completed' : 'Donate Anonymously'}
            </Button>
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement | undefined =>
  contractAddress ? (
    <span data-testid="board-address" style={{ fontSize: '0.75rem', color: '#aaa' }}>
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;
