import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Menu, 
  MenuItem, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  styled,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { SavedLayout } from '../types/layout';

export interface TopMenuProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  savedLayouts: SavedLayout[];
  onSaveLayout: (layout: { name: string; timestamp: number }) => void;
  onLoadLayout: (layout: SavedLayout) => void;
  onDeleteLayout: (layoutName: string) => void;
  onResetLayout: () => void;
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  height: '32px',
  minHeight: '32px',
  '& .MuiToolbar-root': {
    height: '32px',
    minHeight: '32px',
    padding: '0 8px',
  },
  '& .MuiButton-root': {
    textTransform: 'none',
    padding: '4px 8px',
    minWidth: 'unset',
    height: '24px',
  },
  '& .MuiIconButton-root': {
    padding: '4px',
    width: '24px',
    height: '24px',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1rem',
  },
}));

const MenuButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: '12px',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const TopMenu: React.FC<TopMenuProps> = ({
  onSaveLayout,
  onLoadLayout,
  onDeleteLayout,
  onResetLayout,
  savedLayouts
}) => {
  const [layoutAnchor, setLayoutAnchor] = useState<null | HTMLElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');

  const handleSaveLayout = () => {
    if (layoutName.trim()) {
      onSaveLayout({
        name: layoutName,
        timestamp: Date.now()
      });
      setSaveDialogOpen(false);
      setLayoutName('');
    }
  };

  return (
    <>
      <StyledAppBar position="static">
        <Toolbar variant="dense">
          <MenuButton
            onClick={(e) => setLayoutAnchor(e.currentTarget)}
            startIcon={<SaveIcon />}
          >
            Layout
          </MenuButton>
          <Menu
            anchorEl={layoutAnchor}
            open={Boolean(layoutAnchor)}
            onClose={() => setLayoutAnchor(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: {
                backgroundColor: 'background.paper',
                borderRadius: 1,
                boxShadow: 4,
                minWidth: 180,
              }
            }}
          >
            <MenuItem onClick={() => {
              setLayoutAnchor(null);
              setSaveDialogOpen(true);
            }}>
              <SaveIcon sx={{ mr: 1, fontSize: '1rem' }} />
              Save Layout
            </MenuItem>
            <MenuItem
              onClick={() => {
                onResetLayout();
                setLayoutAnchor(null);
              }}
            >
              <RefreshIcon sx={{ mr: 1, fontSize: '1rem' }} />
              Reset Layout
            </MenuItem>
            {savedLayouts.length > 0 && (
              <>
                <MenuItem
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <LoadIcon sx={{ mr: 1, fontSize: '1rem' }} />
                  Saved Layouts
                </MenuItem>
                {savedLayouts.map((layout) => (
                  <MenuItem
                    key={layout.name}
                    onClick={() => {
                      onLoadLayout(layout);
                      setLayoutAnchor(null);
                    }}
                    sx={{
                      pl: 4,
                      pr: 1,
                      fontSize: '0.875rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{layout.name}</span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayout(layout.name);
                      }}
                      sx={{
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: '1 !important' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))}
              </>
            )}
          </Menu>

          <div style={{ flexGrow: 1 }} />

          <Tooltip title="Settings">
            <IconButton size="small" color="inherit">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </StyledAppBar>

      {/* Save Layout Dialog */}
      <Dialog 
        open={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            minWidth: 300,
          }
        }}
      >
        <DialogTitle>Save Layout</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Layout Name"
            fullWidth
            variant="outlined"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveLayout} disabled={!layoutName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};