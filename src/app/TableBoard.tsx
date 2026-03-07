"use client";
// Task row menu component (must be top-level, not inside JSX)
import { getApiUrl, DEFAULT_SERVER_URL as SERVER_URL, authenticatedFetch } from "./apiUrl";
import { io, Socket } from "socket.io-client";

import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

function TaskRowMenu({
  row,
  onDelete,
  onView,
  onMoveUp,
  onMoveDown,
  onMoveTop,
  onMoveBottom,
  onExportPdf,
  onExportExcel
}: {
  row: Row,
  onDelete: () => void,
  onView: () => void,
  onMoveUp?: () => void,
  onMoveDown?: () => void,
  onMoveTop?: () => void,
  onMoveBottom?: () => void,
  onExportPdf?: () => void,
  onExportExcel?: () => void
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleView = () => {
    if (typeof window !== 'undefined' && document && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleClose();
    onView();
  };

  const menuSx = {
    color: theme.palette.text.primary,
    py: 1.5,
    px: 2,
    gap: 1.5,
    minHeight: 'auto',
    '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
  };

  const iconSx = {
    minWidth: 0,
    color: 'inherit',
    '& .MuiSvgIcon-root': { fontSize: 20 }
  };

  const textSx = {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'inherit'
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            boxShadow: theme.shadows[8],
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
            ml: 1, // Add some margin to the left
            overflow: 'visible',
            '& .MuiList-root': { py: 1 }
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, pb: 1.5 }}>
          <Typography variant="overline" sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1, fontSize: '0.7rem' }}>ACTIONS</Typography>
        </Box>

        <MenuItem onClick={handleView} sx={menuSx}>
          <ListItemIcon sx={iconSx}><Box component="span" sx={{ fontSize: 18 }}>👁</Box></ListItemIcon>
          <Typography sx={textSx}>Open Details</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem onClick={() => { handleClose(); if (onMoveUp) onMoveUp(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><ArrowUpwardIcon /></ListItemIcon>
          <Typography sx={textSx}>Move Up</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onMoveDown) onMoveDown(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><ArrowDownwardIcon /></ListItemIcon>
          <Typography sx={textSx}>Move Down</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onMoveTop) onMoveTop(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><VerticalAlignTopIcon /></ListItemIcon>
          <Typography sx={textSx}>Move to Top</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onMoveBottom) onMoveBottom(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><VerticalAlignBottomIcon /></ListItemIcon>
          <Typography sx={textSx}>Move to Bottom</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem onClick={() => { handleClose(); if (onExportPdf) onExportPdf(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><PictureAsPdfIcon /></ListItemIcon>
          <Typography sx={textSx}>Export PDF</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); if (onExportExcel) onExportExcel(); }} sx={menuSx}>
          <ListItemIcon sx={iconSx}><TableViewIcon /></ListItemIcon>
          <Typography sx={textSx}>Export Excel</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem onClick={() => { handleClose(); onDelete(); }} sx={{
          ...menuSx,
          color: theme.palette.error.main,
          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }
        }}>
          <ListItemIcon sx={{ ...iconSx, color: 'inherit' }}><DeleteIcon /></ListItemIcon>
          <Typography sx={textSx}>Delete Task</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import React, { useState, useEffect } from "react";
import TimelineIcon from "@mui/icons-material/Timeline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import HistoryIcon from "@mui/icons-material/History";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DateRangeIcon from "@mui/icons-material/DateRange";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Flag from "react-flagkit";
// Country name to ISO 3166-1 alpha-2 code mapping for react-flagkit
const countryCodeMap: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO", "Antigua and Barbuda": "AG", "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cabo Verde": "CV", "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL", "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo (Congo-Brazzaville)": "CG", "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czechia (Czech Republic)": "CZ", "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE", "Eswatini (fmr. 'Swaziland')": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI", "France": "FR", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Grenada": "GD", "Guatemala": "GT", "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT", "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH", "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar (Burma)": "MM", "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO", "Oman": "OM", "Pakistan": "PK", "Palau": "PW", "Palestine State": "PS", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC", "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM", "Sao Tome and Principe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH", "Timor-Leste": "TL", "Togo": "TG", "Tonga": "TO", "Trinidad and Tobago": "TT", "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Tuvalu": "TV", "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States of America": "US", "Uruguay": "UY", "Uzbekistan": "UZ", "Vanuatu": "VU", "Vatican City": "VA", "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW"
};
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
dayjs.extend(relativeTime);
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Tooltip,
  Typography,
  Stack,
  Select,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
  Switch,
  Popover,
  InputAdornment,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  Badge,
  Autocomplete,
  ListItemIcon,
  Divider,
  ListItemAvatar,
  Tabs,
  Tab,
  CircularProgress,
  alpha
} from "@mui/material";
import BoltIcon from '@mui/icons-material/Bolt';
import PeopleSelector, { Person } from "./PeopleSelector";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import LogoutIcon from "@mui/icons-material/Logout";
import GroupIcon from "@mui/icons-material/Group";
import ColumnTypeSelector from "./ColumnTypeSelector";
import { Column, Row, ColumnType, ColumnOption } from "../types";
import { useNotification } from "./NotificationContext";

// Columns will be loaded dynamically from backend; do not use hardcoded IDs.
const initialColumns: Column[] = [];



interface TableBoardProps {
  tableId: string | null;
  taskId?: string | null;
  initialTab?: string | null;
}

const initialRows: Row[] = [
  {
    id: uuidv4().toString(),
    values: {
      task: "Started",
      owner: "",
      status: "Started",
      due: "",
      priority: "",
    },
  },
];

const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

// Separate component to prevent table re-renders on every keystroke
function DateCellEditor({ 
  initialValue, 
  onSave 
}: { 
  initialValue: any, 
  onSave: (val: any) => void 
}) {
  const theme = useTheme();
  // Ensure we consistently use Dayjs or null
  const [value, setValue] = useState(initialValue ? dayjs(initialValue) : null);
  
  // Refs to track state for event handlers and cleanup
  const valueRef = React.useRef(value);
  const savedRef = React.useRef(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleSave = () => {
    // Prevent double saving
    if (savedRef.current) return;
    savedRef.current = true;
    onSave(valueRef.current);
  };

  // Ensure modification is saved when component unmounts (e.g. clicking another cell)
  useEffect(() => {
    return () => {
      // Just check savedRef, no need to set it here as cleanup runs last
      if (!savedRef.current) {
        onSave(valueRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <DatePicker
        value={value}
        onAccept={() => handleSave()}
        onChange={(newValue) => {
           setValue(newValue);
           valueRef.current = newValue;
        }}
        slotProps={{
          textField: {
            size: 'small',
            autoFocus: true,
            fullWidth: true,
            variant: "standard",
            InputProps: { 
                disableUnderline: true,
                style: { fontSize: '0.875rem' } 
            },
            sx: { 
                height: '100%',
                bgcolor: theme.palette.background.paper,
                '& .MuiInputBase-root': {
                    padding: '0 8px', // Centered vertical padding
                    height: '100%',
                    alignItems: 'center'
                },
                '& .MuiInputBase-input': {
                    padding: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center'
                }
            },
            onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }
          },
          popper: {
             sx: { zIndex: theme.zIndex.tooltip + 10 }
          }
        }}
      />
    </Box>
  );
}
export default function TableBoard({ tableId, taskId, initialTab }: TableBoardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Workspace view state
  const [workspaceView, setWorkspaceView] = useState<'table' | 'kanban' | 'gantt' | 'calendar' | 'doc' | 'gallery'>('table');
  const [filterText, setFilterText] = useState("");
  const [filterPerson, setFilterPerson] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  // Current date for calendar view
  const [currentDate, setCurrentDate] = useState(dayjs());
  // Chat view state
  // Socket.IO State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [boardTypingUsers, setBoardTypingUsers] = useState<string[]>([]);
  const [taskTypingUsers, setTaskTypingUsers] = useState<Record<string, string[]>>({});
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

    // Initialize Socket Connection - depends on tableId
    useEffect(() => {
        if (!tableId) return;

        console.log('Connecting socket to:', SERVER_URL || window.location.origin);
        
        const newSocket = io(SERVER_URL || window.location.origin, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            newSocket.emit('join_table', tableId);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
             // If websocket fails, force polling on reconnection
             // @ts-ignore - Transport manipulation is internal but necessary here
            if (newSocket.io.opts.transports && (newSocket.io.opts.transports as any[]).indexOf('websocket') !== -1) {
                 console.log('Falling back to polling transport');
                 newSocket.io.opts.transports = ['polling', 'websocket'];
            }
        });
        
        // ... (rest of listeners)

        newSocket.on('typing_board', ({ user }) => {
      setBoardTypingUsers(prev => {
        // Don't show typing indicator for yourself
        // Note: We need access to currentUser ref, but it's a dependency, so we're good.
        if (currentUser && user === currentUser.name) return prev;
        if (prev.includes(user)) return prev;
        return [...prev, user];
      });
    });

    newSocket.on('stop_typing_board', ({ user }) => {
      setBoardTypingUsers(prev => prev.filter(u => u !== user));
    });

    newSocket.on('typing_task', ({ taskId, user }) => {
      setTaskTypingUsers(prev => {
        // Don't show typing indicator for yourself
        if (currentUser && user === currentUser.name) return prev;
        
        const current = prev[taskId] || [];
        if (current.includes(user)) return prev;
        return { ...prev, [taskId]: [...current, user] };
      });
    });

    newSocket.on('stop_typing_task', ({ taskId, user }) => {
      setTaskTypingUsers(prev => {
        const current = prev[taskId] || [];
        return { ...prev, [taskId]: current.filter(u => u !== user) };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [tableId, currentUser]);


  const [isChatOpen, setIsChatOpen] = useState(false);
  const [boardChatMessages, setBoardChatMessages] = useState<{
    id: string;
    text: string;
    sender: string;
    senderAvatar?: string;
    time: string;
    attachment?: { name: string, type: string, url: string, size?: number };
  }[]>([]);
  const [newBoardChatMessage, setNewBoardChatMessage] = useState("");
  const [pendingBoardFile, setPendingBoardFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string, type: string, url: string, size?: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessageCountRef = React.useRef(0);
  const isFirstLoadRef = React.useRef(true);
  const boardChatEndRef = React.useRef<HTMLDivElement>(null);
  const taskChatEndRef = React.useRef<HTMLDivElement>(null);
  const taskDetailsChatEndRef = React.useRef<HTMLDivElement>(null);
  
  // -- NEW: State for Task Discussions --
  const [chatTab, setChatTab] = useState<'chat' | 'files' | 'activity'>('chat');
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const [chatScheduledTime, setChatScheduledTime] = useState<string>(""); 
  const [isSending, setIsSending] = useState(false);
  const chatFileRef = React.useRef<HTMLInputElement>(null);
  // -----------------------------------


  // Scroll to bottom of Board Chat when messages update or chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
          boardChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [boardChatMessages, isChatOpen]);



  // Reset state when Table ID changes
  useEffect(() => {
    isFirstLoadRef.current = true;
    prevMessageCountRef.current = 0;
    setUnreadCount(0);
    setBoardChatMessages([]);
  }, [tableId]);

  // Fetch chat messages with polling
  useEffect(() => {
    let isMounted = true;
    const fetchChat = () => {
      authenticatedFetch(getApiUrl(`/tables/${tableId}/chat`))
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (Array.isArray(data)) {
             // Transform timestamp to readable time
             const formattedData = data.map((msg: any) => ({
                 ...msg,
                 time: msg.timestamp ? dayjs(Number(msg.timestamp)).format('MMM D, HH:mm') : '',
             }));

             // If first load, sync the ref immediately to prevent notification
             if (isFirstLoadRef.current) {
                 prevMessageCountRef.current = formattedData.length;
                 isFirstLoadRef.current = false;
             }

            setBoardChatMessages(prev => {
              // Compare content only to avoid unnecessary re-renders
              if (JSON.stringify(prev) !== JSON.stringify(formattedData)) {
                return formattedData;
              }
              return prev;
            });
          }
        })
        .catch((err) => console.error("Failed to fetch chat messages", err));
    };

    fetchChat(); // Initial fetch
    const intervalId = setInterval(fetchChat, 4000); // Poll every 4 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [tableId]);

  // Track unread messages when chat is closed
  useEffect(() => {
    const checkAndNotify = async () => {
        // Request notification permission if not yet requested/granted (Web only)
        if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const newCount = boardChatMessages.length;

        if (!isChatOpen) {
            if (newCount > prevMessageCountRef.current) {
                // Read current user from localStorage to avoid hook dependency cycle
                const userJson = localStorage.getItem("user");
                const user = userJson ? JSON.parse(userJson) : null;
                const currentUserName = user ? user.name : 'User';

                const newMessages = boardChatMessages.slice(prevMessageCountRef.current);
                const externalNewMessages = newMessages.filter(m => m.sender !== currentUserName);

                if (externalNewMessages.length > 0) {
                    setUnreadCount(prev => prev + externalNewMessages.length);
                    
                    const latestMsg = externalNewMessages[externalNewMessages.length - 1];
                    const title = 'New Board Message';
                    const body = `${latestMsg.sender}: ${latestMsg.text}`;

                    // Native check: Notification logic
                    if (Capacitor.isNativePlatform()) {
                       // On mobile, send regardless of document.hidden because app might be open but chat closed
                       try {
                           await LocalNotifications.schedule({
                               notifications: [
                                   {
                                       title: title,
                                       body: body,
                                       id: new Date().getTime() & 0x7FFFFFFF, // Unique ID (safe int)
                                       schedule: { at: new Date(Date.now() + 100) },
                                       sound: undefined,
                                       attachments: undefined,
                                       actionTypeId: "",
                                       extra: null
                                   }
                               ]
                           });
                       } catch (e) {
                           console.error("Failed to schedule local notification", e);
                       }
                    } else if ((document.hidden || !isChatOpen) && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, {
                            body: body,
                        });
                    }
                }
            }
        }
        prevMessageCountRef.current = boardChatMessages.length;
    };
    checkAndNotify();
  }, [boardChatMessages, isChatOpen]);

  const handleSendBoardChat = async () => {
    if (!newBoardChatMessage.trim() && !pendingBoardFile) return;

    let attachment = undefined;
    
    // If there's a file, upload it first
    if (pendingBoardFile) {
      const formData = new FormData();
      formData.append('file', pendingBoardFile);

      try {
        const uploadRes = await authenticatedFetch(getApiUrl('/upload'), {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) throw new Error('Upload failed');

        const uploadData = await uploadRes.json();
        const fileUrl = uploadData.url.startsWith('http') ? uploadData.url : (SERVER_URL + uploadData.url);
        
        attachment = {
          name: uploadData.name,
          type: uploadData.type,
          url: fileUrl,
          size: uploadData.size || pendingBoardFile.size
        };
      } catch (err) {
        console.error("Failed to upload file", err);
        showNotification("Failed to upload file. Please try again.", "error");
        return;
      }
    }

    const tempId = uuidv4();
    const msg = {
      id: tempId,
      text: newBoardChatMessage, // Send whatever text is in the input (could be empty if just file)
      sender: currentUser?.name || 'User',
      senderAvatar: currentUser?.avatar,
      time: dayjs().format('MMM D, HH:mm'),
      attachment
    };

    // Optimistic update
    setBoardChatMessages(prev => [...prev, msg]);
    setNewBoardChatMessage("");
    setPendingBoardFile(null);

    try {
      await authenticatedFetch(getApiUrl(`/tables/${tableId}/chat`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      // specific success notification only if it was a file upload primarily? 
      // showNotification("Message sent successfully!", "success");
    } catch (err) {
      console.error("Failed to send message", err);
      showNotification("Failed to send message. Please try again.", "error");
    }
  };

  const handleBoardFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPendingBoardFile(file);
    }
    // Clear input value so same file can be selected again
    event.target.value = '';
  };

  // Document view state
  const [docContent, setDocContent] = useState("");
  const [docSaving, setDocSaving] = useState(false);
  // Chat popover state
  const [chatAnchor, setChatAnchor] = useState<null | HTMLElement>(null);
  const [chatPopoverKey, setChatPopoverKey] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTaskId, setChatTaskId] = useState<string | null>(null);
  // --- State ---

  // Fix popover anchor to button
  // (Removed duplicate handleOpenChat definition)

  // Handler to close the review dialog
  const handleCloseReview = () => {
    setReviewTask(null);
    setShowEmailAutomation(false);
    setMobileTab('details'); // Reset tab on close
  };
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [reviewTask, setReviewTask] = useState<Row | null>(null);
  
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const targetTaskId = taskId || searchParams.get('taskId');
    const targetTab = initialTab || searchParams.get('tab');

    if (targetTaskId && tableId) {
        // Fetch task
        authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/${targetTaskId}`))
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && (data.task || data.id)) {
                    setReviewTask(data.task || data);
                    
                    if (targetTab === 'chat' || targetTab === 'files' || targetTab === 'activity') {
                        if (isMobile) setMobileTab(targetTab as any);
                        else setRightPanelTab(targetTab as any);
                    }
                }
            })
            .catch(err => console.error("Failed to load task from URL", err));
    }
  }, [tableId, taskId, initialTab, searchParams, isMobile]);

  const [mobileTab, setMobileTab] = useState<'details' | 'chat' | 'files' | 'activity'>('details');
  const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'files' | 'activity'>('chat');

  // Scroll to bottom of Task Chat (Discussion) when open
  useEffect(() => {
    if (chatTaskId && (mobileTab === 'chat' || rightPanelTab === 'chat' || !!chatAnchor)) {
      setTimeout(() => {
          taskChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatMessages, chatTaskId, mobileTab, rightPanelTab, chatAnchor]);

  // Sync mobile tab to right panel
  useEffect(() => {
    if (mobileTab !== 'details') {
      setRightPanelTab(mobileTab as any);
    }
  }, [mobileTab]);

  // Sync right panel tab to mobile tab (when not in details mode)
  useEffect(() => {
    if (mobileTab !== 'details') {
      setMobileTab(rightPanelTab);
    }
  }, [rightPanelTab]);

  // Real-time polling for Task Chat (Side Panel)
  useEffect(() => {
    // Scroll to bottom when messages change or chat is opened
    if (reviewTask && (mobileTab === 'chat' || rightPanelTab === 'chat')) {
        setTimeout(() => {
            taskDetailsChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
    
    if (!reviewTask || (mobileTab !== 'chat' && rightPanelTab !== 'chat')) return;

    const pollTaskChat = async () => {
      try {
        const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/${reviewTask.id}`));
        const updatedRow = await res.json();
        if (updatedRow && updatedRow.values) {
          const newMessages = updatedRow.values.message || [];
          setReviewTask(prev => {
            if (prev && prev.id === reviewTask.id && JSON.stringify(prev.values.message) !== JSON.stringify(newMessages)) {
              return { ...prev, values: { ...prev.values, message: newMessages } };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to poll task chat", err);
      }
    };

    const intervalId = setInterval(pollTaskChat, 4000);
    return () => clearInterval(intervalId);
    // Add reviewTask.values.message to dependency array to trigger scroll on new messages
  }, [reviewTask?.id, mobileTab, rightPanelTab, tableId, JSON.stringify(reviewTask?.values?.message)]);

  // Real-time polling for Task Chat (Discussion Popover)
  useEffect(() => {
    if (!chatTaskId || !chatAnchor) return;

    const pollPopoverChat = async () => {
      try {
        const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/${chatTaskId}`));
        const updatedRow = await res.json();
        if (updatedRow && updatedRow.values) {
          const newMessages = updatedRow.values.message || [];
          setChatMessages(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newMessages)) {
              return newMessages;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to poll popover chat", err);
      }
    };

    const intervalId = setInterval(pollPopoverChat, 4000);
    return () => clearInterval(intervalId);
  }, [chatTaskId, !!chatAnchor, tableId]);

  // Email Automation UI state
  const [showEmailAutomation, setShowEmailAutomation] = useState(false);
  const [emailTriggerCol, setEmailTriggerCol] = useState<string>("");
  const [emailCols, setEmailCols] = useState<string[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  
  // New Automation States
  const [automations, setAutomations] = useState<any[]>([]);
  const [isEditingAutomation, setIsEditingAutomation] = useState(false);
  const [currentAutomationId, setCurrentAutomationId] = useState<number | null>(null);
  
  useEffect(() => {
    if (showEmailAutomation && tableId) {
      authenticatedFetch(getApiUrl(`/automation/${tableId}`))
        .then(res => res.ok ? res.json() : [])
        .then(setAutomations)
        .catch(console.error);
    }
  }, [showEmailAutomation, tableId]);
  const [actionType, setActionType] = useState<'email' | 'notification' | 'both'>('email');
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [automationLoading, setAutomationLoading] = useState(false);
  const [tableMembers, setTableMembers] = useState<Person[]>([]);

  // Fetch table members (Owner + Shared Users)
  useEffect(() => {
    if (tableId) {
      authenticatedFetch(getApiUrl(`/tables/${tableId}/members`))
        .then(res => res.ok ? res.json() : [])
        .then(setTableMembers)
        .catch(console.error);
    }
  }, [tableId]);

  // People options for Automation (derived from table members)
  const peopleOptions = React.useMemo(() => {
    return tableMembers.map(m => ({ name: m.name, email: m.email }));
  }, [tableMembers]);

  // --- Sample people list ---
  const samplePeople = [
    {
      name: "Valon Halili",
      email: "valonhalili74@gmail.com",
      avatar: null, // or a URL if you want
    },
    // Add more sample people if needed
  ];
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#e0e4ef");
  const [editingLabelsColId, setEditingLabelsColId] = useState<string | null>(null);
  const [labelEdits, setLabelEdits] = useState<{ [colId: string]: { [idx: number]: string } }>({});
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const editValueRef = React.useRef(editValue);
  useEffect(() => { editValueRef.current = editValue; }, [editValue]);
  const [editAnchorEl, setEditAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null);
  const [renameAnchorEl, setRenameAnchorEl] = useState<null | HTMLElement>(null);
  const [colMenuId, setColMenuId] = useState<string | null>(null);
  const [showColSelector, setShowColSelector] = useState(false);
  const [colSelectorAnchor, setColSelectorAnchor] = useState<null | HTMLElement>(null);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [userPermission, setUserPermission] = useState<'read' | 'edit' | 'owner'>('read');
  const [boardTitle, setBoardTitle] = useState("");
  const [sharedUsersList, setSharedUsersList] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null); // State for invite code
  const [manageAccessOpen, setManageAccessOpen] = useState(false);



  const handleBoardTyping = () => {
    if (socket) {
      const user = currentUser?.name || 'User';
      // Optimistically add self to typing users if desired, but usually we don't show "You are typing"
      // However, we must ensure we don't filter out others just because we are typing
      
      socket.emit('typing_board', { tableId, user });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) socket.emit('stop_typing_board', { tableId, user });
      }, 2000);
    }
  };

  const handleTaskTyping = (taskId: string) => {
    if (socket) {
      const user = currentUser?.name || 'User';
      socket.emit('typing_task', { tableId, taskId, user });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) socket.emit('stop_typing_task', { tableId, taskId, user });
      }, 2000);
    }
  };
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newSharedUserEmail, setNewSharedUserEmail] = useState("");
  const [userSearchOptions, setUserSearchOptions] = useState<any[]>([]);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState<any | null>(null);
  const { showNotification } = useNotification();

  const handleCloseNotification = (_?: React.SyntheticEvent | Event, reason?: string) => {
    // This is now handled by the global NotificationContext, but we can keep it if needed for local cleanup
    // however, we are removing the local notification state.
  };

  const handleMoveColumn = (colId: string, direction: 'left' | 'right' | 'start' | 'end') => {
    // Current column object
    const currentIndex = columns.findIndex(c => c.id === colId);
    if (currentIndex === -1) return;
    const col = columns[currentIndex];

    // Create a new array
    const newColumns = [...columns];

    // Remove the column
    newColumns.splice(currentIndex, 1);

    // Insert at new position
    if (direction === 'start') {
      // Move to start (after title if needed? Assuming after title or sticky if any)
      newColumns.unshift(col);
    } else if (direction === 'end') {
      newColumns.push(col);
    } else if (direction === 'left') {
      if (currentIndex > 0) {
        newColumns.splice(currentIndex - 1, 0, col);
      } else {
        // Already at start
        newColumns.unshift(col);
      }
    } else if (direction === 'right') {
      if (currentIndex < columns.length - 1) {
        newColumns.splice(currentIndex + 1, 0, col);
      } else {
        // Already at end
        newColumns.push(col);
      }
    }

    // Update 'order' property for all columns
    newColumns.forEach((c, idx) => c.order = idx);

    setColumns(newColumns);

    // Persist column order to backend
    authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: newColumns }),
    }).catch(err => console.error("Failed to persist column order", err));
  };

  const handleMoveRow = (rowId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const index = rows.findIndex(r => r.id === rowId);
    if (index === -1) return;

    // Create new array
    const newRows = [...rows];

    if (direction === 'top') {
      const [item] = newRows.splice(index, 1);
      newRows.unshift(item);
    } else if (direction === 'bottom') {
      const [item] = newRows.splice(index, 1);
      newRows.push(item);
    } else if (direction === 'up') {
      if (index === 0) return;
      const [item] = newRows.splice(index, 1);
      newRows.splice(index - 1, 0, item);
    } else if (direction === 'down') {
      if (index === rows.length - 1) return;
      const [item] = newRows.splice(index, 1);
      newRows.splice(index + 1, 0, item);
    }

    setRows(newRows);
    // Persist new row order to backend (send only orderedTaskIds)
    authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/order`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedTaskIds: newRows.map(r => r.id) }),
    }).catch(err => console.error("Failed to persist row order", err));
  };

  const handleExportExcel = (row: Row) => {
    try {
      // Create CSV content
      const headers = columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
      const values = columns.map(col => {
        let val = row.values[col.id];
        if (val === null || val === undefined) return '""';
        let strVal = '';

        if (typeof val === 'object') {
          if (col.type === 'People' && Array.isArray(val)) {
            strVal = val.map((p: any) => p.name).join('; ');
          } else if (col.type === 'Status' && val.label) {
            strVal = val.label;
          } else if (col.type === 'Date' && val) {
            strVal = dayjs(val).format('YYYY-MM-DD');
          } else {
            strVal = JSON.stringify(val);
          }
        } else {
          strVal = String(val);
        }
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(',');

      const csvContent = headers + "\n" + values;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `task_${row.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
      showNotification("Export failed", "error");
    }
  };

  const handleExportPdf = (row: Row) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showNotification("Please allow popups/new tabs to export user", "warning");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Task Details - ${row.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.5; color: #333; }
          h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 30px; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: top; }
          th { background-color: #f8f9fa; font-weight: 600; width: 30%; }
          .meta { margin-bottom: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <h1>Task Details</h1>
        <div class="meta">
          <p><strong>Task ID:</strong> ${row.id}</p>
          <p><strong>Export Date:</strong> ${dayjs().format('YYYY-MM-DD HH:mm')}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${columns.map(col => {
      let val = row.values[col.id];
      let displayVal = '';
      if (val === null || val === undefined) displayVal = '-';
      else if (typeof val === 'object') {
        if (col.type === 'People' && Array.isArray(val)) {
          displayVal = val.map((p: any) => p.name).join(', ');
        } else if (col.type === 'Status' && val.label) {
          displayVal = val.label;
        } else if (col.type === 'Date' && val) {
          displayVal = dayjs(val).format('YYYY-MM-DD');
        } else {
          displayVal = JSON.stringify(val);
        }
      } else {
        displayVal = String(val);
      }

      // Escape HTML
      const escaped = displayVal.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `
                <tr>
                  <td>${col.name}</td>
                  <td>${escaped}</td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
        <script>
          // Auto print when loaded
          window.onload = function() { 
            setTimeout(function() {
                window.print(); 
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  const [renameValue, setRenameValue] = useState("");
  const [deleteColId, setDeleteColId] = useState<string | null>(null);
  const [fileDialog, setFileDialog] = useState<{ open: boolean; file: any | null; rowId: string | null; colId: string | null }>({ open: false, file: null, rowId: null, colId: null });
  const [fileComment, setFileComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);

  // --- Fetch columns and tasks from backend on mount ---
  useEffect(() => {
    if (!tableId) return;
    setLoading(true);

    const userJson = localStorage.getItem("user");
    const user = userJson ? JSON.parse(userJson) : null;
    setCurrentUser(user);
    const currentUserId = user ? user.id : null;

    // Fetch single table info with owner info
    authenticatedFetch(getApiUrl(`/tables/${tableId}`))
      .then((res) => {
        if (res.status === 403) {
          showNotification("You cant access this you are not the owner", "error");
          throw new Error("Forbidden");
        }
        if (!res.ok) throw new Error("Failed to fetch table info");
        return res.json();
      })
      .then((table) => {
        setBoardTitle(table.name);
        setColumns(table.columns || []);
        setDocContent(table.docContent || "");

        // Determine permission
        if (table.workspace_owner_id === currentUserId) {
          setUserPermission('owner');
        } else {
          const shared = table.shared_users || [];
          const myShare = shared.find((u: any) => u.userId === currentUserId);
          setUserPermission(myShare ? myShare.permission : 'read');
        }
      })
      .catch((err) => {
        console.error("Failed to fetch table info", err);
      })
      .finally(() => setLoading(false));

    authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data);
        } else {
          setRows([
            {
              id: 'placeholder',
              values: Object.fromEntries(columns.map(col => [col.id, col.type === 'People' ? [] : '']))
            }
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [tableId]); // columns.length should not trigger re-fetch of basic table info


  // Debounced save for document content
  useEffect(() => {
    if (docContent === undefined || userPermission === 'read') return;

    const timeout = setTimeout(() => {
      setDocSaving(true);
      authenticatedFetch(getApiUrl(`/tables/${tableId}/doc`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: docContent }),
      })
        .then(res => {
          if (!res.ok) console.error('Failed to save doc');
        })
        .finally(() => {
          setDocSaving(false);
        });
    }, 2000);
    return () => clearTimeout(timeout);
  }, [docContent, tableId]); // Removed workspaceView dependency

  // --- Handlers and logic ---
  // Add new task
  const handleAddTask = async () => {
    if (userPermission === 'read') return;
    setLoading(true);
    // Initialize values for all columns
    const values: Record<string, any> = {};
    columns.forEach(col => {
      if (col.type === "Status") {
        values[col.id] = ""; // Blank by default
      } else if (col.type === "Dropdown") {
        values[col.id] = ""; // Blank by default
      } else if (col.type === "Date") {
        values[col.id] = "";
      } else if (col.type === "Checkbox") {
        values[col.id] = false;
      } else {
        values[col.id] = "";
      }
    });
    const newTask = { values };
    const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    const created = await res.json();
    setRows((prev) => [...prev, created]);
    setLoading(false);
  };

  // Drag and drop handler
  const onDragEnd = async (result: any) => {
    if (!result.destination || userPermission === 'read') return;
    // Column drag
    if (result.type === 'column') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(result.source.index, 1);
      newColumns.splice(result.destination.index, 0, removed);
      newColumns.forEach((col, idx) => (col.order = idx));
      setColumns(newColumns);
      // Persist new column order to backend
      await authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: newColumns }),
      });
      // Reload columns from backend to ensure persistence
      const tablesRes = await authenticatedFetch(getApiUrl(`/tables`));
      const tables = await tablesRes.json();
      const table = tables.find((t: any) => t.id === tableId);
      if (table) setColumns(table.columns || []);
      return;
    }
    // Row drag
    if (result.type === undefined || result.type === 'row' || result.type === 'default') {
      const newRows = Array.from(rows);
      const [removed] = newRows.splice(result.source.index, 1);
      newRows.splice(result.destination.index, 0, removed);
      // Ensure all rows have unique, non-empty ids
      const allIds = newRows.map(r => r.id);
      const hasDuplicates = allIds.length !== new Set(allIds).size;
      const hasMissing = allIds.some(id => !id);
      if (hasDuplicates) {
        console.error('Duplicate row ids detected:', allIds);
      }
      if (hasMissing) {
        console.error('Some rows are missing ids:', newRows);
      }
      setRows(newRows);
      // Persist new row order to backend (send only orderedTaskIds)
      await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/order`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedTaskIds: newRows.map(r => r.id) }),
      });
      // Reload rows from backend to ensure persistence
      const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`));
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setRows(data);
      }
    }
  };

  // Add new column
  const handleAddColumn = async (colType: ColumnType, label: string) => {
    if (userPermission === 'read') return;
    // Inject full country list for Country columns
    const fullCountryList = [
      "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Brazzaville)", "Congo (Kinshasa)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
    ];
    const newColumn: Column = {
      id: uuidv4(),
      name: label,
      type: colType,
      order: columns.length,
      options:
        colType === "Country"
          ? fullCountryList.map(c => ({ value: c }))
          : ["Status", "Dropdown", "People"].includes(colType)
            ? []
            : undefined,
    };
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    setShowColSelector(false);
    // Persist columns to backend
    await authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedColumns }),
    });
    // Reload columns from backend to ensure persistence
    const tablesRes = await authenticatedFetch(getApiUrl(`/tables`));
    const tables = await tablesRes.json();
    const table = tables.find((t: any) => t.id === tableId);
    if (table) setColumns(table.columns || []);

    // Update all existing tasks to include the new column with a default value
    const defaultValue = (() => {
      if (colType === "Status" || colType === "Dropdown") return "";
      if (colType === "Checkbox") return false;
      if (colType === "Numbers") return 0;
      return "";
    })();
    const updatedRows = rows.map(row => ({
      ...row,
      values: { ...row.values, [newColumn.id]: defaultValue }
    }));
    setRows(updatedRows);
    // Persist each updated task to backend
    for (const row of updatedRows) {
      await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, values: row.values }),
      });
    }
  };

  // Edit cell
  const handleCellClick = (rowId: string, colId: string, value: any, colType?: string, anchor?: HTMLElement) => {
    // Mobile: Open task details only when clicking the first column
    if (isMobile && columns.length > 0 && columns[0].id === colId) {
      const row = rows.find(r => r.id === rowId);
      if (row) {
        setReviewTask(row);
        return;
      }
    }

    // Only enter edit mode if not already editing this cell
    // Set anchor for popover-based editors
    if (anchor) setEditAnchorEl(anchor);

    if (!editingCell || editingCell.rowId !== rowId || editingCell.colId !== colId) {
      // Close chat popover if clicking any column except Message
      if (colType !== "Message") {
        setChatAnchor(null);
        setChatTaskId(null);
        setChatMessages([]);
        setChatInput("");
      }
      setEditingCell({ rowId, colId });
      if (colType === "Date") {
        setEditValue(value ? dayjs(value) : null);
      } else if (colType === "Timeline") {
        setEditValue({
          start: value?.start ? dayjs(value.start) : null,
          end: value?.end ? dayjs(value.end) : null
        });
      } else if (colType === "People") {
        setEditValue(Array.isArray(value) ? value : []);
      } else if (colType === "Country") {
        setEditValue(value ?? "");
      } else {
        setEditValue(value ?? "");
      }
    }
  };
  // Accept optional valueOverride for immediate save from PeopleSelector
  const handleCellSave = async (rowId: string, colId: string, colType?: string, valueOverride?: any) => {
    if (userPermission === 'read' && colId !== 'message') return;
    // Find and update the row before calling setRows
    const prevRows = [...rows];
    const rowIdx = prevRows.findIndex((row) => row.id === rowId);
    if (rowIdx === -1) return;
    let newValue = valueOverride !== undefined ? valueOverride : editValue;
    const col = columns.find(c => c.id === colId);
    if (col && col.type === "People") {
      newValue = Array.isArray(newValue) ? newValue.map((p: any) => ({ name: p.name, email: p.email })) : [];
    }
    if (colType === "Date") {
      if (dayjs.isDayjs(newValue)) {
        newValue = newValue.isValid() ? newValue.format("YYYY-MM-DD") : "";
      } else if (typeof newValue === 'string' && newValue) {
        // Allow string inputs (e.g. from native date picker)
        const d = dayjs(newValue);
        newValue = d.isValid() ? d.format("YYYY-MM-DD") : "";
      } else {
        newValue = "";
      }
    }
    if (colType === "Timeline") {
      const start = newValue?.start && dayjs(newValue.start).isValid() ? dayjs(newValue.start).format("YYYY-MM-DD") : null;
      const end = newValue?.end && dayjs(newValue.end).isValid() ? dayjs(newValue.end).format("YYYY-MM-DD") : null;
      newValue = { start, end };
    }
    const updatedRow: Row = { ...prevRows[rowIdx], values: { ...prevRows[rowIdx].values, [colId]: newValue } };
    const updatedRows = prevRows.map((row, idx) => idx === rowIdx ? updatedRow : row);
    setRows(updatedRows);
    setEditingCell(null);
    setEditValue("");
    // If editing the placeholder row, treat as new task
    if (rowId === 'placeholder') {
      setLoading(true);
      // Create a new task with the edited value
      const values: Record<string, any> = { ...editValue };
      columns.forEach(col => {
        if (!(col.id in values)) {
          values[col.id] = col.type === 'People' ? [] : '';
        }
      });
      values[colId] = valueOverride !== undefined ? valueOverride : editValue;
      const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const created = await res.json();
      // Remove placeholder and add real task
      setRows([created]);
      setEditingCell(null);
      setEditValue("");
      setLoading(false);
      return;
    }
    // Persist to backend for real rows
    if (updatedRow) {
      const response = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updatedRow.id, values: updatedRow.values }),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.task) {
          // If the edited row is the one currently being reviewed, update the reviewTask state
          if (reviewTask && responseData.task.id === reviewTask.id) {
            setReviewTask(responseData.task);
          }
        }
      }

      // Log backend debug logs if present
      const debugLogsHeader = response.headers.get("X-Debug-Logs");
      if (debugLogsHeader) {
        try {
          const logs = JSON.parse(decodeURIComponent(debugLogsHeader));
          logs.forEach((log: { msg: string; obj?: any }) => {
          });
        } catch (e) {
          console.warn("Failed to parse backend debug logs:", e, debugLogsHeader);
        }
      }
    }
  };

  // File upload for Files column - UPDATED for Server Upload
  const handleFileUpload = async (rowId: string, colId: string, files: FileList | null) => {
    if (userPermission === 'read' || !files || files.length === 0) return;

    try {

      // 1. Upload each file to server
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await authenticatedFetch(getApiUrl('/upload'), {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            console.error('Upload failed for file:', file.name);
            return null;
          }

          const data = await res.json();
          // Return object with metadata + url
          return {
            name: data.name || file.name,
            url: data.url,
            type: file.type,
            size: file.size,
            originalName: data.originalName,
            uploadedAt: new Date().toISOString()
          };
        } catch (err) {
          console.error('File upload error:', err);
          return null;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const validFiles = uploadedFiles.filter((f): f is NonNullable<typeof f> => f !== null);

      if (validFiles.length === 0) {
        console.warn('No files were successfully uploaded');
        return;
      }


      // 2. Update Row State & Persist

      // Calculate new state first to avoid async state update issues
      const targetRow = rows.find(r => r.id === rowId);
      if (targetRow) {
        const prevFiles = Array.isArray(targetRow.values[colId]) ? targetRow.values[colId] : [];
        const newFiles = [...prevFiles, ...validFiles];
        const newRowValues = { ...targetRow.values, [colId]: newFiles };

        // Update local state
        setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, values: newRowValues } : r));

        // Update backend
        await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rowId, values: newRowValues }),
        });
      }

    } catch (error) {
      console.error("Error in handleFileUpload:", error);
    }

    setEditingCell(null);
    setEditValue("");
  };

  // File dialog open/close
  const handleFileClick = (file: any, rowId: string, colId: string) => {
    setFileDialog({ open: true, file, rowId, colId });
  };
  const handleFileDelete = async () => {
    if (!fileDialog.file || !fileDialog.rowId || !fileDialog.colId) return;
    const colId = fileDialog.colId;
    const rowId = fileDialog.rowId;

    // Calculate new values first
    let newValues: any = null;

    setRows(prevRows => {
      const targetRow = prevRows.find(r => r.id === rowId);
      if (!targetRow) return prevRows;

      const files = Array.isArray(targetRow.values[colId]) ? targetRow.values[colId] : [];
      const newFiles = files.filter((f: any) => f !== fileDialog.file);

      newValues = { ...targetRow.values, [colId]: newFiles };

      // Return updated rows
      return prevRows.map(row =>
        row.id === rowId ? { ...row, values: newValues } : row
      );
    });

    // Save to backend using the calculated values
    // Note: We need to trust that the row exists since we found it in state
    // To be safe, we check newValues. But since setRows is async/batched, 
    // we should re-calculate specifically for the API call or use the result from above.
    // However, since we can't extract return value from setRows, we duplicate logic slightly 
    // OR we just use the prevRows approach but outside.

    // Better approach:
    const currentRow = rows.find(r => r.id === rowId);
    if (currentRow) {
      const currentFiles = Array.isArray(currentRow.values[colId]) ? currentRow.values[colId] : [];
      const nextFiles = currentFiles.filter((f: any) => f !== fileDialog.file);
      const nextValues = { ...currentRow.values, [colId]: nextFiles };

      await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, values: nextValues }),
      });
    }

    setFileDialog({ open: false, file: null, rowId: null, colId: null });
  };

  const handleFileCommentSubmit = async () => {
    if (!fileComment.trim() || !fileDialog.file || !fileDialog.rowId || !fileDialog.colId) return;

    const { rowId, colId, file: targetFile } = fileDialog;

    const newComment = {
      id: uuidv4(),
      text: fileComment,
      createdAt: new Date().toISOString(),
      user: currentUser?.name || "User",
      userAvatar: currentUser?.avatar
    };

    let updatedFile: any = null;
    let nextRows: Row[] = [];

    // Calculate new state based on current rows
    const currentRow = rows.find(r => r.id === rowId);
    if (!currentRow) return;

    const currentFiles = Array.isArray(currentRow.values[colId]) ? currentRow.values[colId] : [];
    const updatedFiles = currentFiles.map((f: any) => {
      // Find by reference or unique property (URL is good for uploads)
      if (f === targetFile || (f.url && f.url === targetFile.url)) {
        updatedFile = { ...f, comments: [...(f.comments || []), newComment] };
        return updatedFile;
      }
      return f;
    });

    if (!updatedFile) return;

    const newValues = { ...currentRow.values, [colId]: updatedFiles };

    // Update local state
    setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, values: newValues } : r));

    // Update dialog file reference immediately to show new comment
    setFileDialog(prev => ({ ...prev, file: updatedFile }));
    setFileComment("");

    // Persist to backend
    await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, values: newValues }),
    });
  };

  // Filter options
  const availablePeople = React.useMemo(() => {
    // Return all table members for filtering options
    return tableMembers.map(m => m.name).sort();
  }, [tableMembers]);

  const availableStatuses = React.useMemo(() => {
    const statuses = new Set<string>();
    const statusCols = columns.filter(c => c.type === 'Status');
    statusCols.forEach(c => {
      if (c.options) {
        c.options.forEach(o => statuses.add(o.value));
      }
    });
    return Array.from(statuses).sort();
  }, [columns]);

  // Filter logic
  const filteredRows = React.useMemo(() => {
    if (!filterText && filterPerson.length === 0 && filterStatus.length === 0) return rows;
    const lowerFilter = filterText.toLowerCase();

    return rows.filter(row => {
      // 1. Text Filter
      const textMatch = !filterText || Object.values(row.values).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') {
          return val.toLowerCase().includes(lowerFilter);
        }
        if (typeof val === 'number') {
          return val.toString().includes(lowerFilter);
        }
        if (Array.isArray(val)) {
          return val.some((v: any) => {
            if (typeof v === 'string') return v.toLowerCase().includes(lowerFilter);
            if (v && typeof v === 'object') {
              return (v.name && v.name.toLowerCase().includes(lowerFilter)) ||
                (v.email && v.email.toLowerCase().includes(lowerFilter)) ||
                (v.originalName && v.originalName.toLowerCase().includes(lowerFilter));
            }
            return false;
          });
        }
        if (typeof val === 'object') {
          if (val.start && val.end) {
            return val.start.includes(lowerFilter) || val.end.includes(lowerFilter);
          }
        }
        return false;
      });
      if (!textMatch) return false;

      // 2. People Filter (Assignee or Creator)
      if (filterPerson.length > 0) {
        // Find IDs for selected names
        const selectedMemberIds = filterPerson.map(name => 
            tableMembers.find(m => m.name === name)?.id
        ).filter(Boolean);

        const peopleCols = columns.filter(c => c.type === 'People');
        
        const isAssigned = peopleCols.some(col => {
          const val = row.values[col.id];
          if (Array.isArray(val)) {
            return val.some((p: any) => filterPerson.includes(p.name)); // Match by name
          }
          return false;
        });
        
        const isCreator = row.created_by && selectedMemberIds.includes(row.created_by);

        if (!isAssigned && !isCreator) return false;
      }

      // 3. Status Filter
      if (filterStatus.length > 0) {
        const statusCols = columns.filter(c => c.type === 'Status');
        const hasStatus = statusCols.some(col => {
          const val = row.values[col.id];
          return filterStatus.includes(val);
        });
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [rows, filterText, filterPerson, filterStatus, columns, tableMembers]);

  // Column menu
  const handleColMenuOpen = (event: React.MouseEvent<HTMLElement>, colId: string) => {
    setAnchorEl(event.currentTarget);
    setColMenuId(colId);
  };
  const handleColMenuClose = () => {
    setAnchorEl(null);
    setColMenuId(null);
  };

  // Persist column rename
  const handleRenameColumn = async (colId: string, newName: string) => {
    if (userPermission === 'read') return;
    setColumns(cols => {
      const updated = cols.map(col =>
        col.id === colId ? { ...col, name: newName } : col
      );
      authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
  };

  // Persist column delete
  const handleDeleteColumn = async (colId: string) => {
    if (userPermission === 'read') return;
    setColumns(cols => {
      const updated = cols.filter(col => col.id !== colId);
      authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
    // Also remove column from all rows
    setRows(rows => rows.map(row => {
      const { [colId]: _, ...rest } = row.values;
      return { ...row, values: rest };
    }));
  };

  const handleEditStatusLabel = (colId: string, idx: number, newValue: string) => {
    // Also update the local state while typing
    setLabelEdits(prev => ({
      ...prev,
      [colId]: { ...(prev[colId] || {}), [idx]: newValue }
    }));
  };

  const handleSaveStatusLabel = async (colId: string, idx: number) => {
    const newLabel = labelEdits[colId]?.[idx]?.trim();
    if (!newLabel) return;

    // Find column to get old value
    const col = columns.find(c => c.id === colId);
    const oldOption = col?.options?.[idx];
    if (!oldOption) return;

    // Update columns
    const params = { columns: [] as Column[] }; // Placeholder to capture updated columns

    setColumns(cols => {
      const updated = cols.map(c =>
        c.id === colId && c.options
          ? {
            ...c,
            options: c.options.map((opt, i) =>
              i === idx ? { ...opt, value: newLabel } : opt
            ),
          }
          : c
      );
      params.columns = updated;
      return updated;
    });

    // Persist columns
    await authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: params.columns }),
    });

    // Update all rows that used this value
    const updatedRows = rows.map(r => {
      if (r.values[colId] === oldOption.value) {
        return { ...r, values: { ...r.values, [colId]: newLabel } };
      }
      return r;
    });
    setRows(updatedRows);

    // Persist rows (batch or individually)
    // For simplicity, we just persist the ones that changed
    updatedRows.forEach(r => {
      if (r.values[colId] === newLabel && r.values[colId] !== oldOption.value) {
        authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id, values: r.values }),
        });
      }
    });

    // Clear edit state
    setLabelEdits(edits => {
      const updated = { ...edits[colId] };
      delete updated[idx];
      return { ...edits, [colId]: updated };
    });
  };

  const handleEditStatusColor = async (colId: string, idx: number, color: string) => {
    let updatedCols: Column[] = [];
    setColumns(cols => {
      updatedCols = cols.map(col =>
        col.id === colId && col.options
          ? {
            ...col,
            options: col.options.map((opt, i) =>
              i === idx ? { ...opt, color } : opt
            ),
          }
          : col
      );
      return updatedCols;
    });

    // Persist immediately
    await authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedCols }),
    });
  };

  const openManageAccess = async () => {
    // Determine title if not already set
    if (!boardTitle) {
        try {
            const tableRes = await authenticatedFetch(getApiUrl(`/tables/${tableId}`));
            if (tableRes.ok) {
                const data = await tableRes.json();
                setBoardTitle(data.name);
            }
        } catch (e) { console.error("Could not fetch table name", e); }
    }
    
    setManageAccessOpen(true);
    
    // If owner, fetch management data
    if (userPermission === 'owner') {
        setLoadingUsers(true);
        try {
        const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/shared-users`));
        if (res.ok) {
            setSharedUsersList(await res.json());
        }
        
        const peopleRes = await authenticatedFetch(getApiUrl(`/people`));
        if (peopleRes.ok) {
            setUserSearchOptions(await peopleRes.json());
        }

        const currentTableRes = await authenticatedFetch(getApiUrl(`/tables/${tableId}`));
        if(currentTableRes.ok) {
            const tData = await currentTableRes.json();
            setInviteCode(tData.invite_code || null);
        }
        } catch (err) {
        console.error(err);
        } finally {
        setLoadingUsers(false);
        }
    }
  };

  const handleLeaveTable = async () => {
      try {
          if (!currentUser?.id) return;
          const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/share/${currentUser.id}`), {
              method: 'DELETE'
          });
          if (res.ok) {
              showNotification("You have left the table", "success");
              // Redirect to dashboard or refresh logic
              window.location.href = '/dashboard';
          } else {
              showNotification("Failed to leave table", "error");
          }
      } catch (err) {
          console.error(err);
          showNotification("Failed to leave table", "error");
      }
  };

  const handleCreateInviteCode = async () => {
    try {
        const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/invite-code`), { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            setInviteCode(data.invite_code);
            showNotification("Invite link created", "success");
        }
    } catch (error) {
        console.error("Failed to create invite code", error);
        showNotification("Failed to create invite link", "error");
    }
  };

  const handleDeleteInviteCode = async () => {
    try {
        const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/invite-code`), { method: 'DELETE' });
        if (res.ok) {
            setInviteCode(null);
            showNotification("Invite link disabled", "success");
        }
    } catch (error) {
        console.error("Failed to delete invite code", error);
        showNotification("Failed to disable invite link", "error");
    }
  };
  
  const handleChangePermission = async (userId: string, currentPermission: 'read'|'edit') => {
      const newPermission = currentPermission === 'read' ? 'edit' : 'read';
      // Reuse POST endpoint for update
      try {
        const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/share`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, permission: newPermission })
        });
        if (res.ok) {
            // Update local state
            setSharedUsersList(prev => prev.map(u => u.id === userId ? { ...u, permission: newPermission } : u));
            showNotification(`Permission updated to ${newPermission}`, "success");
        }
      } catch (err) {
          console.error(err);
          showNotification("Failed to update permission", "error");
      }
  };

  const handleRemoveSharedUser = async (userId: string) => {
    try {
      const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/share/${userId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        setSharedUsersList(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSharedUser = async () => {
    if (!selectedUserToInvite) return;
    try {
      const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/share`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserToInvite.id, permission: 'edit' })
      });
      if (res.ok) {
        setSelectedUserToInvite(null);
        showNotification("User added successfully", "success");
        // Refresh list
        const updated = await authenticatedFetch(getApiUrl(`/tables/${tableId}/shared-users`));
        if (updated.ok) {
            setSharedUsersList(await updated.json());
        }
      } else {
        const err = await res.json();
        showNotification(err.error || "Failed to invite user", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to invite user", "error");
    }
  };

  const handleAddStatusLabel = (colId: string) => {
    if (userPermission === 'read') return;
    if (!newStatusLabel.trim()) return;
    let updatedCols: Column[] = [];

    setColumns(cols => {
      updatedCols = cols.map(col =>
        col.id === colId && col.options && !col.options.some(opt => opt.value === newStatusLabel.trim())
          ? {
            ...col,
            options: [...col.options, { value: newStatusLabel.trim(), color: newStatusColor }],
          }
          : col
      );
      return updatedCols;
    });

    authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedCols }),
    });

    setNewStatusLabel("");
    setNewStatusColor("#e0e4ef");
  };

  const handleDeleteStatusLabel = async (colId: string, idx: number) => {
    if (userPermission === 'read') return;
    let updatedCols: Column[] = [];
    setColumns(cols => {
      updatedCols = cols.map(col =>
        col.id === colId && col.options
          ? {
            ...col,
            options: col.options.filter((_, i) => i !== idx),
          }
          : col
      );
      return updatedCols;
    });

    await authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedCols }),
    });

    // Also clear value from rows
    const col = columns.find(c => c.id === colId);
    const deletedOption = col?.options?.[idx];

    if (deletedOption) {
      setRows(prevRows =>
        prevRows.map(row => {
          if (row.values[colId] === deletedOption.value) {
            // Update backend as well
            const newValues = { ...row.values, [colId]: "" };
            authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: row.id, values: newValues }),
            });
            return { ...row, values: newValues };
          }
          return row;
        })
      );
    }
  };

  // --- Render cell by type ---
  // Handler for opening chat popover
  const handleOpenChat = (
    event: React.MouseEvent<HTMLElement>,
    rowId: string,
    messages: any[],
    colId: string
  ) => {
    setChatAnchor(event.currentTarget);
    setChatPopoverKey(`${rowId}-${colId}`);
    setChatInput("");
    setChatTaskId(rowId);
    // Always load messages from backend when opening
    authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/${rowId}`))
      .then(res => res.json())
      .then(task => setChatMessages(task.values.message || []));
  };
  const handleCloseChat = () => {
    setChatAnchor(null);
    setChatPopoverKey(null);
    setChatMessages([]);
    setChatInput("");
    setChatTaskId(null);
    setChatTab('chat');
    setChatAttachment(null);
    setChatScheduledTime("");
    if (chatFileRef.current) chatFileRef.current.value = "";
  };
  
  const handleSendChat = async (targetIdOverride?: string) => {
    // Determine if we can send (text OR attachment must exist)
    const targetId = targetIdOverride || chatTaskId || (reviewTask ? reviewTask.id : null);
    if (!targetId) return;
    if (!chatInput.trim() && !chatAttachment) return;
    if (isSending) return;

    setIsSending(true);
    let attachment = null;
    const row = rows.find(r => r.id === targetId);
    if (!row) {
        setIsSending(false);
        return;
    }

    try {
        // 1. Upload File if present
        if (chatAttachment) {
          const formData = new FormData();
          formData.append('file', chatAttachment);
          
          const res = await authenticatedFetch(getApiUrl('/upload'), { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            attachment = {
                name: data.name || chatAttachment.name,
                url: data.url,
                type: chatAttachment.type,
                size: chatAttachment.size,
                originalName: data.originalName,
                uploadedAt: new Date().toISOString()
            };
          }
        }

        const newMsg = {
          id: uuidv4(),
          sender: currentUser?.name || "User",
          senderAvatar: currentUser?.avatar,
          text: chatInput,
          timestamp: new Date().toISOString(),
          attachment: attachment,
          scheduledFor: chatScheduledTime ? new Date(chatScheduledTime).toISOString() : undefined,
          notificationSent: chatScheduledTime ? false : undefined
        };

        // Construct updated values
        let updatedValues = { ...row.values, message: [...(row.values.message || []), newMsg] };

        // If we added a file, ALSO save to the first "File" column
        if (attachment) {
             const fileCol = columns.find(c => c.type === 'Files');
             if (fileCol) {
                 const existingFiles = Array.isArray(row.values[fileCol.id]) ? row.values[fileCol.id] : [];
                 updatedValues[fileCol.id] = [...existingFiles, attachment];
             }
        }

        // Update Backend
        await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, values: updatedValues }),
        });

        // Update Local State
        setChatMessages(prev => [...prev, newMsg]);
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, values: updatedValues } : r));
        
        // If reviewing, update that state too
        if (reviewTask && reviewTask.id === row.id) {
            setReviewTask(prev => prev ? ({ ...prev, values: updatedValues }) : null);
        }

        // Reset inputs
        setChatInput("");
        setChatAttachment(null);
        setChatScheduledTime("");
        if (chatFileRef.current) chatFileRef.current.value = "";

    } catch (e) {
      console.error("Failed to send chat or upload file", e);
    } finally {
      setIsSending(false);
    }
  };
  const renderCell = (row: Row, col: Column) => {
    // Force Priority column to always use Dropdown logic for editing
    const effectiveCol = col.id === "priority" ? { ...col, type: "Dropdown" } : col;
    let value = row.values ? row.values[col.id] : "";
    if (effectiveCol.type === "Dropdown" && col.id !== "priority") {
      const options = effectiveCol.options || [];
      const isEditing = editingCell && editingCell.rowId === row.id && editingCell.colId === col.id;
      const isLabelEditing = editingLabelsColId === effectiveCol.id;
      const valueStr = value || '-';

      return (
        <>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              if (userPermission !== 'read') {
                setStatusAnchor(e.currentTarget);
                setEditingCell({ rowId: row.id, colId: col.id });
              }
            }}
            sx={{
              bgcolor: 'transparent',
              color: theme.palette.text.primary, // Neutral text color
              borderRadius: '6px',
              textAlign: 'left', // Align text left for dropdowns usually
              py: isMobile ? 0.25 : 0.5,
              px: isMobile ? 0.5 : 1,
              cursor: userPermission !== 'read' ? 'pointer' : 'default',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              minWidth: isMobile ? 70 : 100,
              maxWidth: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: userPermission !== 'read' ? theme.palette.action.hover : 'transparent',
                color: userPermission !== 'read' ? theme.palette.text.primary : theme.palette.text.primary
              },
              border: `1px solid ${theme.palette.divider}`, // Neutral border
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
          >
            <Typography variant="body2" sx={{
              fontWeight: 400, // Regular weight
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              display: 'block',
              maxWidth: '100%',
              minWidth: 0,
              flex: 1
            }}>
              {valueStr}
            </Typography>
            {userPermission !== 'read' && <Box component="span" sx={{ fontSize: 12, ml: 1, opacity: 0.5 }}>▼</Box>}
          </Box>

          {/* Dropdown Picker Popover */}
          {isEditing && userPermission !== 'read' && (
            <Popover
              open={Boolean(statusAnchor)}
              anchorEl={statusAnchor}
              onClose={() => {
                setStatusAnchor(null);
                setEditingCell(null);
                setEditingLabelsColId(null); // Reset mode on close
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                sx: {
                  mt: 0.5,
                  p: 1.5,
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff',
                  color: theme.palette.text.primary,
                  borderRadius: 2,
                  boxShadow: theme.shadows[8],
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 200,
                  maxWidth: 280
                }
              }}
            >
              {!isLabelEditing ? (
                // --- Simple Selection Mode ---
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 300, overflowY: 'auto' }}>
                  <Box
                    onClick={() => {
                        handleCellSave(row.id, col.id, col.type, "");
                        setStatusAnchor(null);
                        setEditingCell(null);
                    }}
                    sx={{
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                        borderRadius: '4px',
                        py: 0.75,
                        px: 1.5,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.1s',
                        bgcolor: !value ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                   >
                     <Box component="span">(Blank)</Box>
                     {!value && <Box component="span" sx={{ color: theme.palette.primary.main, fontSize: 14 }}>✓</Box>}
                   </Box>
                  {options.map((opt) => (
                    <Box
                      key={opt.value}
                      onClick={() => {
                        handleCellSave(row.id, col.id, col.type, opt.value);
                        setStatusAnchor(null);
                        setEditingCell(null);
                      }}
                      sx={{
                        color: theme.palette.text.primary,
                        borderRadius: '4px',
                        py: 0.75,
                        px: 1.5,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.1s',
                        bgcolor: value === opt.value ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.value}
                      </Box>
                      {value === opt.value && <Box component="span" sx={{ color: theme.palette.primary.main, fontSize: 14 }}>✓</Box>}
                    </Box>
                  ))}
                  {options.length === 0 && <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic', px: 1 }}>No options</Typography>}
                   <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, mt: 0.5, pt: 0.5 }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                           onClick={() => setEditingLabelsColId(effectiveCol.id)}
                          sx={{
                            color: theme.palette.text.secondary,
                            width: '100%',
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover }
                          }}
                        >
                          Edit Options
                        </Button>
                  </Box>
                </Box>
              ) : (
                // --- Edit Options Mode (No Colors) ---
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase' }}>
                      Edit Dropdown Options
                    </Typography>
                    <IconButton size="small" onClick={() => setEditingLabelsColId(null)} sx={{ color: theme.palette.text.secondary, p: 0.5 }}>
                      <Box component="span" sx={{ fontSize: 18 }}>×</Box>
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {options.map((opt, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          defaultValue={opt.value}
                          placeholder="Option label"
                          onBlur={(e) => handleSaveStatusLabel(col.id, idx)}
                          onChange={(e) => handleEditStatusLabel(col.id, idx, e.target.value)}
                          sx={{
                            flex: 1,
                            input: { 
                              color: theme.palette.text.primary, 
                              py: 0.5, px: 1, 
                              fontSize: '0.85rem' 
                            },
                            '& .MuiOutlinedInput-root': {
                                bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff',
                                borderRadius: 1,
                                '& fieldset': { borderColor: theme.palette.divider },
                                '&:hover fieldset': { borderColor: theme.palette.text.primary },
                                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main }
                            }
                          }}
                        />
                         {/* We can re-use handleEditStatusLabel/Save even if it was named "Status" */}
                      </Box>
                    ))}
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>+</Box>}
                    onClick={async () => {
                      const newOption = { value: 'New Option', color: '#e0e4ef' }; // Keep structure but ignore color
                      const updated = [...options, newOption];
                      // Update columns
                      setColumns(cols => cols.map(c => c.id === col.id ? { ...c, options: updated } : c));
                      // Persist
                      await authenticatedFetch(getApiUrl(`/tables/${tableId}/columns`), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ columns: columns.map(c => c.id === col.id ? { ...c, options: updated } : c) }),
                      });
                    }}
                    sx={{
                      borderColor: theme.palette.divider,
                      color: theme.palette.text.secondary,
                      textTransform: 'none',
                      mt: 0.5,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                      }
                    }}
                  >
                    Add Option
                  </Button>
                </Box>
              )}
            </Popover>
          )}
        </>
      );
    }

    // Status/Priority (Keep original colorful logic)
    if (effectiveCol.type === "Status" || effectiveCol.id === "priority") {
      const options = effectiveCol.options || [];
      const isEditing = editingCell && editingCell.rowId === row.id && editingCell.colId === col.id;
      const isLabelEditing = editingLabelsColId === effectiveCol.id;
      const currentOption = options.find(o => o.value === value) || { value: value || '-', color: '#e0e4ef' };

      return (
        <>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              if (userPermission !== 'read') {
                setStatusAnchor(e.currentTarget);
                setEditingCell({ rowId: row.id, colId: col.id });
              }
            }}
            sx={{
              bgcolor: currentOption.color,
              color: theme.palette.text.primary,
              borderRadius: '4px',
              textAlign: 'center',
              py: isMobile ? 0.25 : 0.5,
              px: isMobile ? 0.5 : 1,
              cursor: userPermission !== 'read' ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              minWidth: isMobile ? 70 : 100,
              maxWidth: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'filter 0.2s',
              '&:hover': { filter: userPermission !== 'read' ? 'brightness(1.1)' : 'none' },
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.2)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%', minWidth: 0, flex: 1 }}>
              {currentOption.value}
            </Typography>
          </Box>

          {/* Status Picker Popover */}
          {isEditing && userPermission !== 'read' && (
            <Popover
              open={Boolean(statusAnchor)}
              anchorEl={statusAnchor}
              onClose={() => {
                setStatusAnchor(null);
                setEditingCell(null);
                setEditingLabelsColId(null);
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  p: 2,
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  borderRadius: 3,
                  boxShadow: theme.shadows[8],
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 220,
                  maxWidth: 280
                }
              }}
            >
              {!isLabelEditing ? (
                /* Standard Selection Mode */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 0.5, fontWeight: 600, textTransform: 'uppercase' }}>
                    Select Status
                  </Typography>
                  <Box
                    onClick={() => {
                      handleCellSave(row.id, col.id, col.type, "");
                      setStatusAnchor(null);
                      setEditingCell(null);
                    }}
                    sx={{
                      bgcolor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      border: `1px dashed ${theme.palette.divider}`,
                      borderRadius: '4px',
                      py: 1,
                      px: 2,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: 500,
                      fontStyle: 'italic',
                      transition: 'transform 0.1s',
                      '&:hover': { transform: 'scale(1.02)', filter: 'brightness(1.1)', borderColor: theme.palette.primary.main, color: theme.palette.primary.main },
                    }}
                  >
                    (Blank)
                  </Box>
                  {options.map((opt) => (
                    <Box
                      key={opt.value}
                      onClick={() => {
                        handleCellSave(row.id, col.id, col.type, opt.value);
                        setStatusAnchor(null);
                        setEditingCell(null);
                      }}
                      sx={{
                        bgcolor: opt.color,
                        color: theme.palette.text.primary,
                        borderRadius: '4px',
                        py: 1,
                        px: 2,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontWeight: 500,
                        transition: 'transform 0.1s',
                        '&:hover': { transform: 'scale(1.02)', filter: 'brightness(1.1)' },
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {opt.value}
                    </Box>
                  ))}
                  {true && (
                    <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, mt: 1, pt: 1, display: 'flex', justifyContent: 'center' }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setEditingLabelsColId(effectiveCol.id)}
                        sx={{
                          color: theme.palette.text.secondary,
                          textTransform: 'none',
                          fontSize: '0.8rem',
                          background: 'transparent',
                          backgroundColor: 'transparent',
                          boxShadow: 'none',
                          '&:hover': {
                            color: theme.palette.text.primary,
                            bgcolor: theme.palette.action.hover,
                            background: theme.palette.action.hover,
                            backgroundColor: theme.palette.action.hover,
                            boxShadow: 'none'
                          }
                        }}
                      >
                        Edit Labels
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                /* Edit Labels Mode */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase' }}>
                      Edit Labels
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setEditingLabelsColId(null)}
                      sx={{ color: theme.palette.text.primary, minWidth: 'auto', p: 0.5 }}
                    >
                      Done
                    </Button>
                  </Box>

                  <Box sx={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {options.map((opt, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                          type="color"
                          value={opt.color}
                          onChange={(e) => handleEditStatusColor(effectiveCol.id, idx, e.target.value)}
                          style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }}
                        />
                        <input
                          type="text"
                          value={labelEdits[effectiveCol.id]?.[idx] ?? opt.value}
                          onChange={(e) => handleEditStatusLabel(effectiveCol.id, idx, e.target.value)}
                          onBlur={() => handleSaveStatusLabel(effectiveCol.id, idx)}
                          style={{
                            flex: 1,
                            background: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            color: theme.palette.text.primary,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            outline: 'none'
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteStatusLabel(effectiveCol.id, idx)}
                          sx={{ color: theme.palette.error.main, p: 0.5, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 1.5, display: 'flex', gap: 1 }}>
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      placeholder="New label"
                      value={newStatusLabel}
                      onChange={(e) => setNewStatusLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStatusLabel(effectiveCol.id)}
                      style={{
                        flex: 1,
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleAddStatusLabel(effectiveCol.id)}
                      disabled={!newStatusLabel.trim()}
                      sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, borderRadius: 1, '&:hover': { bgcolor: theme.palette.primary.dark }, '&.Mui-disabled': { opacity: 0.5 } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Popover>
          )}
        </>
      );
    }

    // People Column - Modern
    if (col.type === "People") {
      const people = Array.isArray(value) ? value : [];
      const isEditing = editingCell && editingCell.rowId === row.id && editingCell.colId === col.id;

      // Calculate displayed people vs overflow
      const maxDisplay = isMobile ? 2 : 3;
      const displayPeople = people.slice(0, maxDisplay);
      const overflow = people.length - maxDisplay;

      return (
        <>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              if (userPermission !== 'read') {
                setStatusAnchor(e.currentTarget);
                setEditingCell({ rowId: row.id, colId: col.id });
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: userPermission !== 'read' ? 'pointer' : 'default',
              minHeight: isMobile ? 28 : 32,
              borderRadius: '18px',
              transition: 'all 0.2s',
              gap: 0.5,
              '&:hover': { bgcolor: userPermission !== 'read' ? theme.palette.action.hover : 'transparent' }
            }}
          >
            {people.length === 0 ? (
              <Box sx={{
                width: isMobile ? 24 : 28,
                height: isMobile ? 24 : 28,
                borderRadius: '50%',
                border: `1px dashed ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.text.secondary
              }}>
                <AddIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
                {displayPeople.map((p, i) => (
                  <Tooltip key={p.email || i} title={p.name}>
                    <Avatar
                      sx={{
                        width: isMobile ? 24 : 28,
                        height: isMobile ? 24 : 28,
                        fontSize: isMobile ? 10 : 12,
                        bgcolor: '#0073ea',
                        border: `2px solid ${theme.palette.background.default}`,
                        ml: i > 0 ? -1 : 0,
                        zIndex: 10 - i
                      }}
                    >
                      {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                    </Avatar>
                  </Tooltip>
                ))}
                {overflow > 0 && (
                  <Box sx={{
                    width: isMobile ? 24 : 28,
                    height: isMobile ? 24 : 28,
                    borderRadius: '50%',
                    bgcolor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${theme.palette.background.default}`,
                    ml: -1,
                    zIndex: 0
                  }}>
                    +{overflow}
                  </Box>
                )}
              </Box>
            )}

            {/* Quick add button visible on hover or if empty
               (Optional, keeping clean for now)
            */}
          </Box>

          {isEditing && userPermission !== 'read' && (
            <Popover
              open={Boolean(statusAnchor)}
              anchorEl={statusAnchor}
              onClose={() => {
                setStatusAnchor(null);
                setEditingCell(null);
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  width: 300,
                  bgcolor: theme.palette.background.default,
                  color: theme.palette.text.primary,
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  border: `1px solid ${theme.palette.divider}`
                }
              }}
            >
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                  Assigned People
                </Typography>

                {/* Search / Add */}
                <PeopleSelector
                  value={people}
                  // Pass the tableId so the selector knows to show board members
                  tableId={tableId}
                  onChange={(newPeople) => {
                    handleCellSave(row.id, col.id, col.type, newPeople);
                    // Keep popover open to allow multiple adds
                  }}
                  onClose={() => { /* Handled solely by Popover onClose */ }}
                />

                {/* Current People List */}
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {people.length === 0 && (
                    <Typography variant="body2" sx={{ color: '#5a5b7a', fontStyle: 'italic' }}>
                      No one assigned
                    </Typography>
                  )}
                  {people.map((p) => (
                    <Box key={p.email} sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 2,
                      p: 1
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#0073ea' }}>
                          {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1 }}>{p.email}</Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newPeople = people.filter(person => person.email !== p.email);
                          handleCellSave(row.id, col.id, col.type, newPeople);
                        }}
                        sx={{ color: '#5a5b7a', '&:hover': { color: theme.palette.error.main, bgcolor: 'rgba(226,68,92,0.1)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Popover>
          )}
        </>
      );
    }

    if (editingCell && editingCell.rowId === row.id && editingCell.colId === col.id && userPermission !== 'read') {
      // Country column: dropdown in edit mode (case-insensitive)
      if (effectiveCol.type && effectiveCol.type.toLowerCase() === "country" && effectiveCol.options) {
        return (
          <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
            <Select
              value={value || ""}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log("Country changed:", newValue);
                setEditingCell(null);
                handleCellSave(row.id, col.id, col.type, newValue);
              }}
              autoFocus
              displayEmpty
              renderValue={(selected: any) => {
                if (!selected) {
                  return <span style={{ color: theme.palette.text.secondary }}>Select country</span>;
                }
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
                    {countryCodeMap[selected as keyof typeof countryCodeMap] ? (
                      <Flag country={countryCodeMap[selected as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
                    ) : null}
                    <Typography sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: 15 }}>{selected}</Typography>
                  </Box>
                )
              }}
              sx={{ color: theme.palette.text.primary, bgcolor: theme.palette.background.paper, borderRadius: 2, boxShadow: theme.shadows[1], minHeight: 44 }}
              id={`country-select-${row.id}-${col.id}`}
              name={`country-select-${row.id}-${col.id}`}
              MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: 2 } } }}
            >
              {effectiveCol.options.map((opt: ColumnOption) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ color: theme.palette.text.primary, background: 'transparent', display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
                  {countryCodeMap[opt.value as keyof typeof countryCodeMap] ? (
                    <Flag country={countryCodeMap[opt.value as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
                  ) : null}
                  <Typography sx={{ fontWeight: 500, fontSize: 15 }}>{opt.value}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }
      // Files column
      if (effectiveCol.type === "Files") {
        return (
          <input
            type="file"
            multiple
            autoFocus
            id={`file-upload-${row.id}-${col.id}`}
            name={`file-upload-${row.id}-${col.id}`}
            onChange={(e) => handleFileUpload(row.id, col.id, e.target.files)}
            style={{ marginTop: 8, color: theme.palette.text.primary, background: theme.palette.background.paper }}
          />
        );
      }
      if (effectiveCol.type === "Doc") {
        return (
          <TextField
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(row.id, col.id)}
            onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
            size="small"
            autoFocus
            placeholder="Paste doc link or text"
            id={`doc-input-${row.id}-${col.id}`}
            name={`doc-input-${row.id}-${col.id}`}
            InputProps={{ style: { color: theme.palette.text.primary } }}
          />
        );
      }


      // Message column: show chat popover trigger in edit mode
      if (col.type === "Message") {
        return (
          <Button variant="outlined" size="small" onClick={e => handleOpenChat(e, row.id, value || [], col.id)}>
            Chat
          </Button>
        );
      }

      // Date
      if (col.type === "Date") {
        return (
          <Box sx={{ width: '100%', height: 32, borderRadius: 1, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
            <DateCellEditor
              initialValue={editValue}
              onSave={(val) => handleCellSave(row.id, col.id, col.type, val)}
            />
          </Box>
        );
      }

      // Timeline
      if (col.type === "Timeline") {
        return (
          <Box
            ref={(node: HTMLElement | null) => {
              if (node && !editAnchorEl) {
                setEditAnchorEl(node);
              }
            }}
            sx={{
              width: '100%',
              height: 32,
              display: 'flex',
              alignItems: 'center',
              px: 1,
              bgcolor: theme.palette.action.hover,
              borderRadius: 2
            }}
          >
            <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: '0.875rem' }}>
              {editValue && editValue.start && editValue.end ? `${dayjs(editValue.start).format('YYYY-MM-DD')} - ${dayjs(editValue.end).format('YYYY-MM-DD')}` : 'Set timeline'}
            </Typography>
            <Popover
              open={Boolean(editAnchorEl)}
              anchorEl={editAnchorEl}
              onClose={() => handleCellSave(row.id, col.id, col.type, editValue)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{ sx: { bgcolor: theme.palette.background.paper, p: 2, borderRadius: 2, boxShadow: theme.shadows[8], border: `1px solid ${theme.palette.divider}`, mt: 1 } }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <DatePicker
                  label="Start"
                  value={editValue?.start || null}
                  onChange={(newDate: any) => setEditValue((prev: any) => ({ ...prev, start: newDate }))}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        width: 140,
                        bgcolor: theme.palette.background.paper,
                        input: { color: theme.palette.text.primary },
                        label: { color: theme.palette.text.secondary },
                        '& .MuiInputLabel-root': { color: theme.palette.text.secondary },
                        '& .MuiInputBase-input': { color: theme.palette.text.primary },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.text.primary },
                        '& .MuiSvgIcon-root': { color: theme.palette.text.secondary }
                      }
                    },
                    openPickerIcon: { sx: { color: theme.palette.text.secondary } }
                  }}
                />
                <Typography sx={{ color: theme.palette.text.secondary }}>to</Typography>
                <DatePicker
                  label="End"
                  value={editValue?.end || null}
                  onChange={(newDate: any) => setEditValue((prev: any) => ({ ...prev, end: newDate }))}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        width: 140,
                        bgcolor: theme.palette.background.paper,
                        input: { color: theme.palette.text.primary },
                        label: { color: theme.palette.text.secondary },
                        '& .MuiInputLabel-root': { color: theme.palette.text.secondary },
                        '& .MuiInputBase-input': { color: theme.palette.text.primary },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.text.primary },
                        '& .MuiSvgIcon-root': { color: theme.palette.text.secondary }
                      }
                    },
                    openPickerIcon: { sx: { color: theme.palette.text.secondary } }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleCellSave(row.id, col.id, col.type, editValue); }}
                  sx={{ color: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2) } }}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Popover>
          </Box>
        );
      }

      // Numbers
      if (col.type === "Numbers") {
        return (
          <TextField
            type="number"
            value={editValue}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                setEditValue(val);
              }
            }}
            onBlur={() => handleCellSave(row.id, col.id)}
            onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
            size="small"
            autoFocus
            id={`number-input-${row.id}-${col.id}`}
            name={`number-input-${row.id}-${col.id}`}
            inputProps={{ inputMode: 'decimal', pattern: '^-?\d*\.?\d*$', style: { color: theme.palette.text.primary } }}
            InputProps={{ style: { color: theme.palette.text.primary } }}
          />
        );
      }

      // Checkbox
      if (col.type === "Checkbox") {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 1 }}>
            <Checkbox
              checked={!!editValue}
              onChange={(e) => {
                setEditValue(e.target.checked);
                handleCellSave(row.id, col.id, col.type, e.target.checked);
              }}
              sx={{
                color: theme.palette.text.secondary,
                '&.Mui-checked': { color: '#00c875' }
              }}
              autoFocus
            />
          </Box>
        );
      }

      // Default: text input with autocomplete
      const uniqueOptions = Array.from(new Set(rows.map(r => r.values[col.id]).filter(v => v && typeof v === 'string' && v.trim() !== '')));

      return (
        <Autocomplete
          freeSolo
          disableClearable
          options={uniqueOptions as string[]}
          value={editValue}
          onInputChange={(event, newInputValue) => {
            setEditValue(newInputValue);
          }}
          onChange={(event, newValue) => {
             if (newValue) {
               setEditValue(newValue);
               handleCellSave(row.id, col.id, col.type, newValue);
             }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              autoFocus
              onBlur={() => handleCellSave(row.id, col.id, col.type, editValue)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  handleCellSave(row.id, col.id, col.type, editValue);
                }
              }}
              InputProps={{
                ...params.InputProps,
                style: { color: theme.palette.text.primary, padding: 0 },
                sx: { 
                    '& .MuiOutlinedInput-root': { padding: '0 8px !important' },
                    '& .MuiInputBase-input': { padding: '8px 0 !important' } 
                }
              }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
              }}
            />
          )}
          slotProps={{
            paper: {
              sx: {
                  bgcolor: theme.palette.background.default,
                  color: theme.palette.text.primary,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  mt: 1,
                  '& .MuiMenuItem-root': {
                    '&:hover': { bgcolor: theme.palette.action.hover },
                    '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)' }
                }
            }
          }}}
          sx={{ width: '100%' }}
        />
      );
    }
    // --- Read mode ---
    // Country column: always show dropdown with flag icons using effectiveCol (case-insensitive)
    if (effectiveCol.type && effectiveCol.type.toLowerCase() === "country" && effectiveCol.options) {
      // Read mode: styled country display
      return (
        <Box
          onClick={() => handleCellClick(row.id, col.id, value)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 0.5 : 1,
            px: isMobile ? 1 : 1.5,
            py: isMobile ? 0.25 : 0.5,
            borderRadius: 2,
            bgcolor: theme.palette.background.paper,
            minHeight: isMobile ? 32 : 44,
            minWidth: isMobile ? 120 : 160,
            cursor: userPermission !== 'read' ? 'pointer' : 'default',
            '&:hover': { bgcolor: userPermission !== 'read' ? theme.palette.action.hover : 'transparent', cursor: userPermission !== 'read' ? 'pointer' : 'default' }
          }}
        >
          {countryCodeMap[value as keyof typeof countryCodeMap] ? (
            <Flag country={countryCodeMap[value as keyof typeof countryCodeMap]} size={isMobile ? 18 : 24} style={{ marginRight: isMobile ? 5 : 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
          ) : null}
          <Typography sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: isMobile ? 13 : 15 }}>{value || <span style={{ color: theme.palette.text.secondary }}>Select Country</span>}</Typography>
        </Box>
      );
    }
    // --- Read mode ---
    // ...existing code...
    // Fix popover anchor to button
    if (col.type === "Files") {
      const files = value && Array.isArray(value) ? value : [];
      // Hidden file input ref
      const fileInputId = `file-input-${row.id}-${col.id}`;
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, cursor: userPermission !== 'read' ? 'pointer' : 'default' }}
          onClick={e => {
            e.stopPropagation();
            if (userPermission !== 'read') {
              const input = document.getElementById(fileInputId) as HTMLInputElement | null;
              if (input) input.click();
            }
          }}
        >
          {files.length > 0 ? files.map((f: File, i: number) => (
            <Chip
              key={i}
              label={f.name}
              size={isMobile ? "small" : "medium"}
              onClick={ev => { ev.stopPropagation(); handleFileClick(f, row.id, col.id); }}
              sx={{
                cursor: 'pointer',
                bgcolor: '#e0e4ef',
                height: isMobile ? 24 : 32,
                fontSize: isMobile ? '0.75rem' : '0.8125rem'
              }}
            />
          )) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Upload file</Typography>
          )}
          {userPermission !== 'read' && (
            <input
              id={fileInputId}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                e.stopPropagation();
                handleFileUpload(row.id, col.id, e.target.files);
                // Reset input so same file can be uploaded again if needed
                (e.target as HTMLInputElement).value = "";
              }}
            />
          )}
        </Box>
      );
    }
    if (col.type === "Doc") {
      return (
        <Typography variant="body2" color="primary" sx={{
          textDecoration: 'underline',
          cursor: userPermission !== 'read' ? 'pointer' : 'default',
          fontSize: isMobile ? '0.75rem' : '0.875rem'
        }} onClick={() => userPermission !== 'read' && handleCellClick(row.id, col.id, value)}>
          {value ? value : 'Add doc link'}
        </Typography>
      );
    }
    if (col.type === "Connect") {
      return (
        <Typography variant="body2" color="secondary" sx={{
          cursor: userPermission !== 'read' ? 'pointer' : 'default',
          fontSize: isMobile ? '0.75rem' : '0.875rem'
        }} onClick={() => userPermission !== 'read' && handleCellClick(row.id, col.id, value)}>
          {value ? value : 'Link to board/row'}
        </Typography>
      );
    }
    if (col.type === "Timeline") {
      return (
        <Box
          id={`cell-${row.id}-${col.id}`}
          onClick={(e) => userPermission !== 'read' && handleCellClick(row.id, col.id, value, col.type, e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: userPermission !== 'read' ? 'pointer' : 'default',
            width: '100%',
            height: isMobile ? 28 : 32,
            px: isMobile ? 0.5 : 1,
            borderRadius: 2,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: userPermission !== 'read' ? theme.palette.action.hover : 'transparent', boxShadow: userPermission !== 'read' ? `0 0 0 1px ${theme.palette.divider}` : 'none' }
          }}
        >
          <TimelineIcon sx={{ fontSize: isMobile ? 14 : 16, mr: 1, color: theme.palette.text.secondary }} />
          <Typography variant="body2" sx={{
            color: value?.start ? '#fff' : theme.palette.text.secondary,
            fontSize: isMobile ? '0.75rem' : '0.875rem'
          }}>
            {value && value.start && value.end ? `${value.start} - ${value.end}` : 'Set timeline'}
          </Typography>
        </Box>
      );
    }
    if (col.type === "Checkbox") {
      return (
        <Box
          sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 1, cursor: userPermission !== 'read' ? 'pointer' : 'default' }}
          onClick={() => userPermission !== 'read' && handleCellSave(row.id, col.id, col.type, !value)}
        >
          <Checkbox
            checked={!!value}
            readOnly
            sx={{
              color: theme.palette.text.secondary,
              '&.Mui-checked': { color: '#00c875' },
              p: 0
            }}
          />
        </Box>
      );
    }
    if (col.type === "Formula") {
      return (
        <Typography variant="body2" color="text.secondary">(auto)</Typography>
      );
    }
    if (col.type === "Extract") {
      return (
        <Typography variant="body2" color="text.secondary">(lookup)</Typography>
      );
    }


    if (col.type === "Date") {
      return (
        <Box
          sx={{
            cursor: userPermission !== 'read' ? 'pointer' : 'default',
            minHeight: isMobile ? 28 : 32,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2,
            px: isMobile ? 1 : 1.5,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: userPermission !== 'read' ? theme.palette.action.hover : 'transparent', boxShadow: userPermission !== 'read' ? `0 0 0 1px ${theme.palette.divider}` : 'none' }
          }}
          onClick={() => userPermission !== 'read' && handleCellClick(row.id, col.id, value, col.type)}
        >
          <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
            {value && dayjs(value).isValid() ? dayjs(value).format('MMM D, YYYY') : '-'}
          </Typography>
        </Box>
      );
    }
    if (col.type && col.type.toLowerCase() === "message") {
      const msgCount = Array.isArray(value) ? value.length : 0;
      return (
        <Badge
          badgeContent={msgCount}
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: theme.palette.primary.main,
              color: theme.palette.text.primary,
              fontSize: '0.6rem',
              fontWeight: 700,
              minWidth: 15,
              height: 15,
              borderRadius: 8,
            }
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />}
            onClick={e => handleOpenChat(e, row.id, value || [], col.id)}
            sx={{
              color: theme.palette.text.secondary,
              borderColor: theme.palette.divider,
              textTransform: 'none',
              fontSize: '0.75rem',
              '&:hover': { color: theme.palette.text.primary, borderColor: theme.palette.primary.main, bgcolor: 'rgba(79, 81, 192, 0.1)' }
            }}
          >
            Chat
          </Button>
        </Badge>
      );
    }
    return (
      <Box
        sx={{
          cursor: userPermission !== 'read' ? 'pointer' : 'default',
          minHeight: isMobile ? 28 : 32,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          px: 1,
          ml: -1, /* Offset the cell padding so it aligns nicely */
          transition: 'all 0.2s',
          '&:hover': { bgcolor: userPermission !== 'read' ? theme.palette.action.hover : 'transparent', boxShadow: userPermission !== 'read' ? `0 0 0 1px ${theme.palette.divider}` : 'none' }
        }}
        onClick={() => userPermission !== 'read' && handleCellClick(row.id, col.id, value)}
      >
        <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
          {value || "-"}
        </Typography>
      </Box>
    );
  };

  // --- JSX ---
  return (
    <Box>
      {/* Rename Column Dialog */}
      <Dialog
        open={!!renamingColId}
        onClose={() => setRenamingColId(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontWeight: 600, pb: 1 }}>Rename Column</DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            type="text"
            fullWidth
            variant="outlined"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && renamingColId && renameValue.trim()) {
                handleRenameColumn(renamingColId, renameValue.trim());
                setRenamingColId(null);
              }
            }}
            InputLabelProps={{
              sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.primary.main } }
            }}
            InputProps={{
              sx: {
                color: theme.palette.text.primary,
                bgcolor: theme.palette.background.paper,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setRenamingColId(null)}
            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (renamingColId && renameValue.trim()) {
                handleRenameColumn(renamingColId, renameValue.trim());
                setRenamingColId(null);
              }
            }}
            variant="contained"
            disabled={!renameValue.trim()}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: '#5558dd' },
              '&.Mui-disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.3)' }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Column Dialog */}
      <Dialog
        open={!!deleteColId}
        onClose={() => setDeleteColId(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>Delete Column</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: theme.palette.text.primary }}>Are you sure you want to delete this column? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteColId(null)}
            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (deleteColId) {
                handleDeleteColumn(deleteColId);
                setDeleteColId(null);
              }
            }}
            variant="contained"
            color="error"
            sx={{
              bgcolor: '#ff4d4d',
              '&:hover': { bgcolor: '#ff3333' }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Access Dialog */}
      <Dialog
        open={manageAccessOpen}
        onClose={() => setManageAccessOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontWeight: 600, pb: 1 }}>Manage Board Access</DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.primary, mb: 2 }}>
            Control who has access to this board.
          </Typography>

          {userPermission === 'owner' ? (
             !inviteCode ? (
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    p: 4, 
                    border: `1px dashed ${theme.palette.divider}`, 
                    borderRadius: 2,
                    bgcolor: theme.palette.action.hover
                }}
            >
                <IconButton 
                    onClick={handleCreateInviteCode}
                    sx={{ 
                        width: 64, 
                        height: 64, 
                        bgcolor: theme.palette.primary.main, 
                        color: theme.palette.text.primary, 
                        mb: 2,
                        '&:hover': { bgcolor: '#5558dd' }
                    }}
                >
                    <AddIcon sx={{ fontSize: 32 }} />
                </IconButton>
                <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 0.5 }}>Start Sharing</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
                    Create an invite link to share this board with others.
                </Typography>
            </Box>
          ) : (
            <Box sx={{ border: '1px solid #6366f1', borderRadius: 2, p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
                {/* Header: Table Name & Stop Sharing */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
                            Sharing
                        </Typography>
                        <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                            {boardTitle}
                        </Typography>
                    </Box>
                    <Button 
                        variant="outlined" 
                        color="error" 
                        size="small" 
                        onClick={handleDeleteInviteCode}
                        sx={{ borderColor: theme.palette.error.main, color: theme.palette.error.main, '&:hover': { borderColor: '#c23046', bgcolor: theme.palette.error.light } }}
                    >
                        Stop Sharing
                    </Button>
                </Box>

                {/* Connection Code Display */}
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: theme.palette.background.default, p: 1.5, borderRadius: 1.5, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>INVITE CODE</Typography>
                        <Typography variant="body1" sx={{ color: theme.palette.text.primary, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }}>
                            {inviteCode}
                        </Typography>
                    </Box>
                    <IconButton 
                        onClick={() => {
                            navigator.clipboard.writeText(inviteCode);
                            showNotification("Code copied!", "success");
                        }}
                        sx={{ color: theme.palette.primary.main }}
                    >
                        <ContentCopyIcon />
                    </IconButton>
                </Box>
                
                {/* Users List */}
                <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1, fontWeight: 600 }}>Connected Users</Typography>
                <List sx={{ bgcolor: theme.palette.background.default, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, mb: 3, maxHeight: 200, overflow: 'auto' }}>
                    {sharedUsersList.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No users connected yet." primaryTypographyProps={{ sx: { color: theme.palette.text.secondary, fontStyle: 'italic', fontSize: '0.875rem' } }} />
                        </ListItem>
                    ) : (
                        sharedUsersList.map((user) => (
                            <ListItem
                                key={user.id}
                                secondaryAction={
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveSharedUser(user.id)} sx={{ color: theme.palette.error.main }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#0073ea', width: 32, height: 32, fontSize: 14 }}>{user.name?.charAt(0).toUpperCase()}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={user.name}
                                    secondary={user.email}
                                    primaryTypographyProps={{ sx: { color: theme.palette.text.primary, fontSize: '0.875rem' } }}
                                    secondaryTypographyProps={{ sx: { color: theme.palette.text.secondary, fontSize: '0.75rem' } }}
                                />
                                <Button
                                    size="small"
                                    onClick={() => handleChangePermission(user.id, user.permission || 'read')}
                                    sx={{ 
                                        mr: 1, 
                                        minWidth: 60, 
                                        color: user.permission === 'edit' ? '#4caf50' : '#ff9800',
                                        borderColor: user.permission === 'edit' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 152, 0, 0.5)',
                                        border: '1px solid',
                                        fontSize: '0.7rem',
                                        py: 0.25
                                    }}
                                >
                                    {user.permission === 'edit' ? 'Editor' : 'Viewer'}
                                </Button>
                            </ListItem>
                        ))
                    )}
                </List>

                {/* Add User Section */}
                <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1, fontWeight: 600 }}>Add User</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                        fullWidth
                        size="small"
                        options={userSearchOptions.filter((u: any) => !sharedUsersList.some(su => su.email === u.email))}
                        getOptionLabel={(option: any) => option.name || option.email}
                        value={selectedUserToInvite}
                        onChange={(event: any, newValue: any | null) => {
                            setSelectedUserToInvite(newValue);
                        }}
                        renderInput={(params) => (
                            <TextField 
                                {...params} 
                                placeholder="Search user..." 
                                InputProps={{
                                    ...params.InputProps,
                                    sx: {
                                        color: theme.palette.text.primary,
                                        bgcolor: theme.palette.background.default,
                                        borderRadius: 1,
                                        fontSize: '0.875rem',
                                        '& fieldset': { borderColor: theme.palette.divider }
                                    }
                                }}
                            />
                        )}
                        renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            return (
                                <li key={key} {...otherProps}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Avatar sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}>{option.name?.charAt(0).toUpperCase()}</Avatar>
                                        <Typography variant="body2">{option.name || option.email}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleAddSharedUser}
                        disabled={!selectedUserToInvite}
                        sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: '#5558dd' } }}
                    >
                        Add
                    </Button>
                </Box>
            </Box>
          )
          ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 1 }}>Shared Board</Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary, mb: 4 }}>
                        You are a <strong>{userPermission === 'edit' ? 'Editor' : 'Viewer'}</strong> on this board.
                    </Typography>
                    <Box sx={{ mx: 'auto', p: 3, border: '1px solid rgba(226, 68, 92, 0.3)', borderRadius: 2, bgcolor: 'rgba(226, 68, 92, 0.05)', maxWidth: 400 }}>
                        <Typography variant="subtitle2" sx={{ color: theme.palette.error.main, mb: 1, fontWeight: 600 }}>Leave Board</Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.primary, mb: 2, fontSize: '0.875rem' }}>
                            Revoke your own access to this board. You will need a new invite to join again.
                        </Typography>
                        <Button
                            variant="outlined" 
                            color="error" 
                            onClick={handleLeaveTable}
                            startIcon={<LogoutIcon />}
                            sx={{ borderColor: theme.palette.error.main, color: theme.palette.error.main, '&:hover': { borderColor: '#c23046', bgcolor: theme.palette.error.light } }}
                        >
                            Leave Board
                        </Button>
                    </Box>
                </Box>
          )}

        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setManageAccessOpen(false)}
            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Board Chat Drawer */}
      <Drawer
        anchor="right"
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 380,
            height: isMobile ? 'calc(100% - 60px)' : '100%',
            mt: isMobile ? '60px' : 0,
            borderTopLeftRadius: isMobile ? 20 : 0,
            borderTopRightRadius: isMobile ? 20 : 0,
            bgcolor: theme.palette.background.default,
            color: theme.palette.text.primary,
            borderLeft: `1px solid ${theme.palette.divider}`,
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
          }
        }}
        BackdropProps={{
          sx: { bgcolor: 'rgba(0,0,0,0.5)' }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(21, 22, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: theme.palette.text.primary, 
                width: 40, height: 40,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}>
                <ChatBubbleOutlineIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.02em' }}>Board Chat</Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>Team collaboration</Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setIsChatOpen(false)}
              size="small"
              sx={{ 
                color: theme.palette.text.secondary, 
                transition: 'all 0.2s',
                '&:hover': { color: theme.palette.text.primary, bgcolor: 'rgba(255,255,255,0.1)', transform: 'rotate(90deg)' } 
              }}
            >
              <Box component="span" sx={{ fontSize: 24, lineHeight: 1 }}>×</Box>
            </IconButton>
          </Box>

          {/* Messages */}
          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 40%)',
            bgcolor: theme.palette.background.default
          }}>
            {boardChatMessages.map((msg, idx) => {
              const isMe = msg.sender === 'You' || (currentUser && msg.sender === currentUser.name);
              const isSequence = idx > 0 && boardChatMessages[idx - 1].sender === msg.sender;
              
              return (
                <Box key={msg.id} sx={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  mt: isSequence ? 0.5 : 2
                }}>
                  {!isSequence && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, ml: isMe ? 0 : 6, mr: isMe ? 6 : 0, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, fontSize: '0.75rem' }}>{msg.sender}</Typography>
                      <Typography variant="caption" sx={{ color: '#565875', fontSize: '0.7rem' }}>{msg.time}</Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <Avatar
                      src={msg.senderAvatar ? (msg.senderAvatar.startsWith('http') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender)}&background=random&color=fff&bold=true`}
                      sx={{ 
                        width: 32, height: 32, 
                        border: `1px solid ${theme.palette.divider}`,
                        opacity: isSequence ? 0 : 1 
                      }}
                    >
                      {!msg.senderAvatar && (msg.sender?.charAt(0) || 'U')}
                    </Avatar>
                    
                    <Box sx={{
                      bgcolor: isMe ? '#6366f1' : (theme.palette.mode === 'dark' ? '#26273b' : theme.palette.grey[100]),
                      background: isMe ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : (theme.palette.mode === 'dark' ? '#26273b' : theme.palette.grey[100]),
                      color: isMe ? '#fff' : (theme.palette.mode === 'dark' ? '#e2e8f0' : theme.palette.text.primary),
                      p: 1.5,
                      px: 2,
                      borderRadius: 2.5,
                      borderTopRightRadius: isMe ? 4 : 18,
                      borderTopLeftRadius: isMe ? 18 : 4,
                      boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none',
                      border: isMe ? 'none' : `1px solid ${theme.palette.divider}`,
                      position: 'relative',
                      minWidth: 60
                    }}>
                      {msg.attachment && (
                        <Box
                          onClick={() => setPreviewFile(msg.attachment!)}
                          sx={{
                            mb: msg.text ? 1.5 : 0,
                            p: 0,
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: `1px solid ${theme.palette.divider}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'scale(1.02)' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <Box sx={{ 
                              p: 1, 
                              bgcolor: 'rgba(255,255,255,0.15)', 
                              borderRadius: 1.5,
                              color: theme.palette.text.primary,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <InsertDriveFileIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600, 
                                fontSize: '0.85rem', 
                                whiteSpace: 'normal', 
                                wordBreak: 'break-all',
                                color: theme.palette.text.primary,
                                lineHeight: 1.2
                              }}>
                                {msg.attachment.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
                                {msg.attachment.size ? `${Math.round(msg.attachment.size / 1024)} KB` : 'Attachment'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      
                      {msg.text && (
                        <Typography variant="body2" sx={{ 
                          lineHeight: 1.6, 
                          fontSize: '0.935rem',
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere', // Ensures long words/URLs break to avoid scroll
                          minWidth: 0,
                          whiteSpace: 'pre-wrap',
                          letterSpacing: '0.01em'
                        }}>
                          {msg.text}
                        </Typography>
                      )}
                      
                      <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end', 
                          gap: 0.5, 
                          mt: 0.5,
                          mb: -0.5, // Pull closer to bottom
                          opacity: 0.7
                      }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
                              {msg.time}
                          </Typography>
                          {isMe && (
                              <Box component="span" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>✓</Box>
                          )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}
            <div ref={boardChatEndRef} />
          </Box>
          
          {/* Input Area */}
          <Box sx={{ 
            p: 2, 
            pt: 1.5,
            borderTop: `1px solid ${theme.palette.divider}`, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(21, 22, 33, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)'
          }}>
            {/* Pending File Preview */}
            {pendingBoardFile && (
              <Box sx={{ 
                mb: 2, 
                p: 1.5, 
                bgcolor: theme.palette.action.selected, 
                border: '1px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'slideUp 0.3s ease-out'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1, bgcolor: theme.palette.primary.main, borderRadius: 1.5, color: theme.palette.text.primary, display: 'flex' }}>
                    <InsertDriveFileIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                    <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600, display: 'block' }}>Ready to send</Typography>
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.text.primary, 
                      fontSize: '0.85rem', 
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {pendingBoardFile.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>{Math.round(pendingBoardFile.size / 1024)} KB</Typography>
                  </Box>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => setPendingBoardFile(null)}
                  sx={{ color: theme.palette.text.secondary, '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                >
                  <Box component="span" sx={{ fontSize: 20 }}>×</Box>
                </IconButton>
              </Box>
            )}

            {boardTypingUsers.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, ml: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                   <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#818cf8', animation: 'typing 1s infinite' }} />
                   <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#818cf8', animation: 'typing 1s infinite 0.2s' }} />
                   <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#818cf8', animation: 'typing 1s infinite 0.4s' }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#818cf8', fontStyle: 'italic', fontWeight: 500 }}>
                  {boardTypingUsers.join(', ')} {boardTypingUsers.length === 1 ? 'is' : 'are'} typing...
                </Typography>
              </Box>
            )}
            
            <input
              type="file"
              hidden
              ref={fileInputRef}
              onChange={handleBoardFileUpload}
            />
            
            <Box sx={{
              display: 'flex',
              gap: 1.5,
              bgcolor: theme.palette.action.hover,
              p: '6px 6px 6px 12px',
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              alignItems: 'flex-end',
              transition: 'all 0.2s',
              '&:focus-within, &:hover': { 
                borderColor: 'rgba(99, 102, 241, 0.5)',
                bgcolor: theme.palette.action.hover,
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
              }
            }}>
              <IconButton
                size="small"
                sx={{ 
                  color: theme.palette.text.secondary, 
                  mb: 0.5, 
                  width: 32, height: 32,
                  transition: 'all 0.2s',
                  '&:hover': { color: theme.palette.text.primary, bgcolor: 'rgba(255,255,255,0.1)' } 
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
              
              <TextField
                fullWidth
                variant="standard"
                placeholder="Type a message..."
                value={newBoardChatMessage}
                onChange={(e) => {
                  setNewBoardChatMessage(e.target.value);
                  handleBoardTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendBoardChat();
                  }
                }}
                multiline
                maxRows={4}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: theme.palette.text.primary,
                    py: 1,
                    fontSize: '0.9rem',
                    '&::placeholder': { color: '#64748b', opacity: 1 }
                  }
                }}
              />
              
              <IconButton 
                onClick={handleSendBoardChat}
                disabled={!newBoardChatMessage.trim() && !pendingBoardFile}
                sx={{ 
                  bgcolor: (newBoardChatMessage.trim() || pendingBoardFile) ? '#6366f1' : 'transparent',
                  background: (newBoardChatMessage.trim() || pendingBoardFile) ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: (newBoardChatMessage.trim() || pendingBoardFile) ? '#fff' : '#475569',
                  width: 36, height: 36,
                  mb: 0.25,
                  transition: 'all 0.2s',
                  boxShadow: (newBoardChatMessage.trim() || pendingBoardFile) ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                  '&:hover': { 
                    transform: (newBoardChatMessage.trim() || pendingBoardFile) ? 'scale(1.05)' : 'none',
                    boxShadow: (newBoardChatMessage.trim() || pendingBoardFile) ? '0 4px 12px rgba(99, 102, 241, 0.5)' : 'none'
                  },
                  '&.Mui-disabled': { color: '#334155' }
                }}
              >
                <SendIcon sx={{ fontSize: 18, ml: 0.2 }} />
              </IconButton>
            </Box>
          </Box>

        </Box>
      </Drawer>

      {/* File Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(21, 22, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(24px)',
            color: theme.palette.text.primary,
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{
          color: theme.palette.text.primary,
          fontWeight: 600,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3,
          bgcolor: 'rgba(255,255,255,0.02)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              p: 1, 
              bgcolor: theme.palette.action.selected, 
              borderRadius: 1.5,
              color: '#818cf8',
              display: 'flex'
            }}>
              <InsertDriveFileIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: '0.01em' }}>{previewFile?.name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              href={previewFile?.url}
              download={previewFile?.name}
              target="_blank"
              startIcon={<Box component="span" sx={{ fontSize: 18 }}>⬇</Box>}
              sx={{ 
                color: theme.palette.text.secondary, 
                borderColor: 'rgba(255,255,255,0.1)', 
                '&:hover': { 
                  color: theme.palette.text.primary, 
                  borderColor: '#fff',
                  bgcolor: theme.palette.action.hover
                },
                textTransform: 'none',
                fontWeight: 500
              }}
              variant="outlined"
              size="small"
            >
              Download
            </Button>
            <IconButton 
              onClick={() => setPreviewFile(null)} 
              sx={{ 
                color: theme.palette.text.secondary, 
                transition: 'all 0.2s',
                '&:hover': { color: theme.palette.text.primary, bgcolor: 'rgba(255,255,255,0.1)', transform: 'rotate(90deg)' } 
              }}
            >
              <Box component="span" sx={{ fontSize: 24, lineHeight: 1 }}>×</Box>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flex: 1, bgcolor: theme.palette.background.default, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {previewFile?.type.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewFile.url}
              alt={previewFile.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <iframe
              src={previewFile?.url}
              title={previewFile?.name}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog >

      {/* Column menu for rename/delete */}
      < Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && !!colMenuId}
        onClose={handleColMenuClose}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
            overflow: 'visible',
            '& .MuiList-root': { py: 1 }
          }
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        <Box sx={{ px: 2, py: 1, pb: 1.5 }}>
          <Typography variant="overline" sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1, fontSize: '0.7rem' }}>COLUMN ACTIONS</Typography>
        </Box>

        <MenuItem
          onClick={() => {
            if (colMenuId) handleMoveColumn(colMenuId, 'left');
            handleColMenuClose();
          }}
          sx={{
            color: theme.palette.text.primary,
            py: 1.5,
            px: 2,
            gap: 1.5,
            '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}><ArrowBackIcon fontSize="small" /></ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Move Left</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (colMenuId) handleMoveColumn(colMenuId, 'right');
            handleColMenuClose();
          }}
          sx={{
            color: theme.palette.text.primary,
            py: 1.5,
            px: 2,
            gap: 1.5,
            '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}><ArrowForwardIcon fontSize="small" /></ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Move Right</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (colMenuId) handleMoveColumn(colMenuId, 'start');
            handleColMenuClose();
          }}
          sx={{
            color: theme.palette.text.primary,
            py: 1.5,
            px: 2,
            gap: 1.5,
            '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}><FirstPageIcon fontSize="small" /></ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Move to Start</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (colMenuId) handleMoveColumn(colMenuId, 'end');
            handleColMenuClose();
          }}
          sx={{
            color: theme.palette.text.primary,
            py: 1.5,
            px: 2,
            gap: 1.5,
            '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}><LastPageIcon fontSize="small" /></ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Move to End</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem
          onClick={() => {
            setRenamingColId(colMenuId);
            setRenameValue(columns.find(c => c.id === colMenuId)?.name || '');
            handleColMenuClose();
          }}
          sx={{
            color: theme.palette.text.primary,
            py: 1.5,
            px: 2,
            gap: 1.5,
            '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}><EditIcon fontSize="small" /></ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Rename</Typography>
        </MenuItem>

        <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

        <MenuItem
          onClick={() => {
            setDeleteColId(colMenuId);
            handleColMenuClose();
          }}
          sx={{
            color: '#ff4d4d',
            py: 1.5,
            px: 2,
            gap: 1.5,
            '&:hover': { bgcolor: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d' }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}><DeleteIcon fontSize="small" /></ListItemIcon>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>Delete Column</Typography>
        </MenuItem>
      </Menu >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5, flexWrap: 'wrap' }}>
        <IconButton
          onClick={e => { e.stopPropagation(); setHeaderMenuAnchor(e.currentTarget); }}
          sx={{
            color: theme.palette.text.secondary,
            height: 40,
            width: 40,
            borderRadius: '8px',
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              color: theme.palette.text.primary,
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              borderColor: theme.palette.primary.main
            }
          }}
        >
          <MoreVertIcon />
        </IconButton>
        {userPermission !== 'read' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddTask}
            sx={{
              bgcolor: '#0073ea',
              color: theme.palette.text.primary,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              px: 2.5,
              height: 40,
              boxShadow: '0 4px 12px rgba(0, 115, 234, 0.2)',
              '&:hover': { bgcolor: '#0060c2' }
            }}
          >
            New task
          </Button>
        )}
        {userPermission !== 'read' && (
          <Button
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowColSelector(true);
              setColSelectorAnchor(e.currentTarget);
            }}
            sx={{
              background: 'transparent',
              backgroundColor: 'transparent',
              color: theme.palette.text.secondary,
              borderColor: theme.palette.divider,
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: '8px',
              px: 2,
              height: 40,
              zIndex: 2,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                color: theme.palette.text.primary,
                bgcolor: 'rgba(79, 81, 192, 0.1)'
              }
            }}
          >
            Add column
          </Button>
        )}

          {/* Automations Button */}
          <Tooltip title="Configure Automations">
            <Button
              variant="outlined"
              startIcon={<BoltIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setShowEmailAutomation(true);
                setMobileTab('details'); // Ensure not in a weird state
              }}
              sx={{
                background: 'transparent',
                backgroundColor: 'transparent',
                color: theme.palette.text.secondary,
                borderColor: theme.palette.divider,
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: '8px',
                px: 2,
                height: 40,
                zIndex: 2,
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.text.primary,
                  bgcolor: 'rgba(79, 81, 192, 0.1)'
                }
              }}
            >
              Automations
            </Button>
          </Tooltip>

        <Button
          variant="outlined"
          startIcon={<GroupIcon sx={{ fontSize: 18 }} />}
          onClick={openManageAccess}
          sx={{
            background: 'transparent',
            backgroundColor: 'transparent',
            color: theme.palette.text.secondary,
            borderColor: theme.palette.divider,
            fontWeight: 500,
            textTransform: 'none',
            borderRadius: '8px',
            px: 2,
            height: 40,
            zIndex: 2,
            '&:hover': {
              borderColor: theme.palette.primary.main,
              color: theme.palette.text.primary,
              bgcolor: 'rgba(79, 81, 192, 0.1)'
            }
          }}
        >
          Manage Access
        </Button>
        <Box sx={{ width: 12, display: { xs: 'none', sm: 'block' } }} />

        {/* Filters Container */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 1.5, md: 1 },
          alignItems: { xs: 'stretch', md: 'center' },
          flexGrow: 1,
          width: { xs: '100%', md: 'auto' },
          mt: { xs: 2, md: 0 },
        }}>

          {/* Search */}
          <TextField
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search tasks..."
            size="small"
            fullWidth={false}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: theme.palette.action.hover,
                color: theme.palette.text.primary,
                borderRadius: '8px',
                fontSize: '0.875rem',
                height: 36,
                paddingLeft: '8px',
                '& fieldset': { border: `1px solid ${theme.palette.divider}` },
                '&:hover fieldset': { borderColor: theme.palette.primary.main },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: '1px' },
                width: { xs: '100%', md: 200 },
                transition: 'all 0.2s',
              }
            }}
          />

          {/* Filter Group */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            width: { xs: '100%', md: 'auto' },
            flexWrap: { xs: 'nowrap', md: 'wrap' }
          }}>

            {/* People Filter */}
            <FormControl size="small" sx={{ flex: { xs: 1, md: 'none' }, minWidth: { xs: 0, md: 120 } }}>
              <Select
                multiple
                displayEmpty
                value={filterPerson}
                onChange={(e) => {
                  const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  setFilterPerson(val as string[]);
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>Person</Typography>;
                  }
                  return <Typography sx={{ color: theme.palette.text.primary, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(selected as string[]).join(', ')}</Typography>;
                }}
                sx={{
                  bgcolor: theme.palette.action.hover,
                  color: theme.palette.text.primary,
                  borderRadius: '8px',
                  height: 36,
                  fontSize: '0.875rem',
                  width: '100%',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  '.MuiSvgIcon-root': { color: theme.palette.text.secondary }
                }}
                MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.default, color: theme.palette.text.primary, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, maxHeight: 300 } } }}
              >
                {availablePeople.map((name) => (
                  <MenuItem key={name} value={name} sx={{ '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.15)' }, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                    <Checkbox checked={filterPerson.includes(name)} sx={{ color: theme.palette.text.secondary, '&.Mui-checked': { color: theme.palette.primary.main }, p: 0.5, mr: 1 }} />
                    <ListItemText primary={name} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                  </MenuItem>
                ))}
                {availablePeople.length === 0 && <MenuItem disabled>No people found</MenuItem>}
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl size="small" sx={{ flex: { xs: 1, md: 'none' }, minWidth: { xs: 0, md: 120 } }}>
              <Select
                multiple
                displayEmpty
                value={filterStatus}
                onChange={(e) => {
                  const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  setFilterStatus(val as string[]);
                }}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>Status</Typography>;
                  }
                  return <Typography sx={{ color: theme.palette.text.primary, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(selected as string[]).join(', ')}</Typography>;
                }}
                sx={{
                  bgcolor: theme.palette.action.hover,
                  color: theme.palette.text.primary,
                  borderRadius: '8px',
                  height: 36,
                  fontSize: '0.875rem',
                  width: '100%',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  '.MuiSvgIcon-root': { color: theme.palette.text.secondary }
                }}
                MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.default, color: theme.palette.text.primary, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, maxHeight: 300 } } }}
              >
                {availableStatuses.map((status) => (
                  <MenuItem key={status} value={status} sx={{ '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.15)' }, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                    <Checkbox checked={filterStatus.includes(status)} sx={{ color: theme.palette.text.secondary, '&.Mui-checked': { color: theme.palette.primary.main }, p: 0.5, mr: 1 }} />
                    <ListItemText primary={status} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                  </MenuItem>
                ))}
                {availableStatuses.length === 0 && <MenuItem disabled>No statuses found</MenuItem>}
              </Select>
            </FormControl>

            {/* Board Chat Button */}
            <Tooltip title="Board Chat">
              <IconButton
                onClick={() => { setIsChatOpen(true); setUnreadCount(0); }}
                sx={{
                  bgcolor: theme.palette.action.hover,
                  color: theme.palette.text.secondary,
                  borderRadius: '8px',
                  border: `1px solid ${theme.palette.divider}`,
                  height: 36,
                  width: 36,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: theme.palette.action.selected, color: theme.palette.primary.main, borderColor: theme.palette.primary.main }
                }}
              >
                <Badge
                  badgeContent={unreadCount}
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: theme.palette.error.main,
                      color: theme.palette.text.primary,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      top: 2,
                      right: 2,
                    }
                  }}
                >
                  <ChatBubbleOutlineIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {/* Column Selector Popover */}
        {showColSelector && colSelectorAnchor && (
          <Popover
            open={showColSelector}
            anchorEl={colSelectorAnchor}
            onClose={() => setShowColSelector(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{ sx: { bgcolor: theme.palette.background.default, color: theme.palette.text.primary, borderRadius: 3, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${theme.palette.divider}` } }}
          >
            <ColumnTypeSelector
              onSelect={(type, label) => {
                handleAddColumn(type, label);
                setShowColSelector(false);
              }}
            />
          </Popover>
        )}
        <Menu
          anchorEl={headerMenuAnchor}
          open={Boolean(headerMenuAnchor)}
          onClose={() => setHeaderMenuAnchor(null)}
          PaperProps={{
            sx: {
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderRadius: 3,
              minWidth: 220,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: `1px solid ${theme.palette.divider}`,
              mt: 1,
              overflow: 'hidden'
            }
          }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="overline" sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1 }}>
              Board Views
            </Typography>
          </Box>
          <MenuItem
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('table'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: theme.palette.action.hover } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(0, 115, 234, 0.1)', display: 'flex' }}>
              <InsertDriveFileIcon sx={{ color: '#0073ea', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}>Table view</Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>Main list view</Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('kanban'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: theme.palette.action.hover } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(0, 200, 117, 0.1)', display: 'flex' }}>
              <TimelineIcon sx={{ color: '#00c875', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}>Kanban</Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>Board status view</Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('gantt'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: theme.palette.action.hover } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(253, 171, 61, 0.1)', display: 'flex' }}>
              <InsertDriveFileIcon sx={{ color: '#fdab3d', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}>Gantt</Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>Timeline view</Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('calendar'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: theme.palette.action.hover } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: theme.palette.error.light, display: 'flex' }}>
              <CalendarMonthIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}>Calendar</Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>Date based view</Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('doc'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: theme.palette.action.hover } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(162, 93, 220, 0.1)', display: 'flex' }}>
              <DescriptionIcon sx={{ color: '#a25ddc', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}>Doc</Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>Document view</Typography>
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('gallery'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: theme.palette.action.hover } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(87, 155, 252, 0.1)', display: 'flex' }}>
              <InsertDriveFileIcon sx={{ color: '#579bfc', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}>File Gallery</Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>Asset gallery</Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Box>

      {
        workspaceView === 'table' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none', overflowX: 'auto' }}>
              <Table sx={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>
                <TableHead>
                  <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                    {(provided) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          '& .MuiTableCell-root': {
                            borderBottom: `1px solid ${theme.palette.divider}`, // Subtle pinkish/border
                            borderTop: `1px solid ${theme.palette.divider}`,
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            textTransform: 'none',
                            letterSpacing: '0.01em',
                            py: 1.75,
                            px: 2,
                            bgcolor: theme.palette.background.paper,
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '20%',
                              height: '60%',
                              width: '1px',
                              bgcolor: theme.palette.divider
                            }
                          }
                        }}
                      >
                        <TableCell
                          padding="checkbox"
                          sx={{
                            minWidth: 48,
                            width: 48,
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            bgcolor: `${theme.palette.background.paper} !important`,
                            borderRight: `1px solid ${theme.palette.divider}`
                          }}
                        />
                        {columns.sort((a, b) => a.order - b.order).map((col, index) => (
                          <Draggable key={col.id} draggableId={col.id} index={index} isDragDisabled={userPermission === 'read'}>
                            {(provided, snapshot) => (
                              <TableCell
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  minWidth: 160,
                                  transition: 'background-color 0.2s',
                                  bgcolor: snapshot.isDragging ? `${theme.palette.action.selected} !important` : theme.palette.background.paper,
                                  '&:hover': { bgcolor: `${theme.palette.action.hover} !important` },
                                  '&:hover .column-actions': { opacity: 1 }
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 28,
                                      height: 28,
                                      borderRadius: '8px',
                                      bgcolor: col.type === 'Status' ? 'rgba(0, 200, 117, 0.15)' :
                                        col.type === 'People' ? 'rgba(162, 93, 220, 0.15)' :
                                          col.type === 'Date' ? 'rgba(226, 68, 92, 0.15)' :
                                            'rgba(99, 102, 241, 0.15)',
                                      color: col.type === 'Status' ? '#00c875' :
                                        col.type === 'People' ? '#a25ddc' :
                                          col.type === 'Date' ? '#e2445c' :
                                            '#818cf8',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                      border: `1px solid ${theme.palette.divider}`
                                    }}>
                                      {col.type === 'Status' && <CheckCircleIcon sx={{ fontSize: 16 }} />}
                                      {col.type === 'People' && <PersonIcon sx={{ fontSize: 16 }} />}
                                      {col.type === 'Date' && <CalendarMonthIcon sx={{ fontSize: 16 }} />}
                                      {col.type === 'Timeline' && <TimelineIcon sx={{ fontSize: 16 }} />}
                                      {col.type === 'Country' && <PublicIcon sx={{ fontSize: 16 }} />}
                                      {col.type === 'Files' && <AttachFileIcon sx={{ fontSize: 16 }} />}
                                      {col.type === 'Doc' && <DescriptionIcon sx={{ fontSize: 16 }} />}
                                      {!['Status', 'People', 'Date', 'Timeline', 'Country', 'Files', 'Doc'].includes(col.type) && <DescriptionIcon sx={{ fontSize: 16 }} />}
                                    </Box>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 600,
                                        color: theme.palette.text.primary,
                                        fontSize: '0.875rem',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {col.name}
                                    </Typography>
                                  </Box>
                                  {userPermission !== 'read' && (
                                    <IconButton
                                      className="column-actions"
                                      size="small"
                                      onClick={(e) => handleColMenuOpen(e, col.id)}
                                      sx={{
                                        opacity: 0,
                                        color: theme.palette.text.secondary,
                                        transition: 'all 0.2s',
                                        width: 24,
                                        height: 24,
                                        '&:hover': { color: theme.palette.text.primary, bgcolor: 'rgba(255,255,255,0.1)' }
                                      }}
                                    >
                                      <MoreVertIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  )}
                                </Box>
                              </TableCell>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {userPermission !== 'read' && (
                          <TableCell
                            sx={{
                              minWidth: 60,
                              width: 60,
                              textAlign: 'center',
                              '&::after': { display: 'none !important' }
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setColSelectorAnchor(e.currentTarget);
                                setShowColSelector(true);
                              }}
                              sx={{
                                color: '#818cf8',
                                bgcolor: theme.palette.action.selected,
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)', borderColor: '#818cf8' }
                              }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                  </Droppable>
                </TableHead>

                <Droppable droppableId="rows-droppable" type="row">
                  {(provided) => {
                    // Find first status column for row coloring
                    const firstStatusCol = [...columns].sort((a, b) => a.order - b.order).find(c => c.type === 'Status');
                    
                    return (
                    <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                      {filteredRows.map((row, index) => {
                        // Calculate background color based on status
                        let rowBg = theme.palette.background.default;
                        let rowHoverBg = theme.palette.action.hover;
                        
                        if (firstStatusCol) {
                           const val = row.values[firstStatusCol.id];
                           // Status options usually have { value, color }
                           const opt = firstStatusCol.options?.find((o: any) => o.value === val);
                           if (opt && opt.color && opt.color.startsWith('#')) {
                               // Add ~12% opacity (hex 1F) for background
                               rowBg = opt.color + '1F';
                               // Add ~20% opacity (hex 33) for hover
                               rowHoverBg = opt.color + '33';
                           }
                        }

                        return (
                        <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={!!filterText}>
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              sx={{
                                bgcolor: snapshot.isDragging ? theme.palette.background.paper : rowBg,
                                '&:hover': { bgcolor: rowHoverBg },
                                transition: 'background-color 0.2s',
                                borderRadius: 4, 
                                ...provided.draggableProps.style
                              }}
                            >
                              {/* Row Drag Handle, Menu, and Message Icon */}

                              <TableCell sx={{
                                width: 60,
                                p: 0,
                                borderBottom: 'none',
                                borderTopLeftRadius: 12,
                                borderBottomLeftRadius: 12,
                                borderLeft: row.created_by ? `6px solid ${stringToColor(row.created_by)}` : undefined,
                                position: 'relative', // Establish containing block for avatar
                                ...(isMobile && {
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 11, // Higher than first data col (zIndex 10)
                                  bgcolor: snapshot.isDragging ? theme.palette.background.paper : theme.palette.background.default,
                                  borderRight: `1px solid ${theme.palette.divider}`
                                })
                              }}>
                                {/* Creator Avatar on Highlighted Task */}
                                {row.created_by && (() => {
                                  const creator = tableMembers.find(m => m.id === row.created_by);
                                  if (!creator) return null;
                                  return (
                                    <Tooltip title={`Created by ${creator.name}`}>
                                      <Avatar 
                                        src={creator.avatar} 
                                        sx={{ 
                                          width: 16, 
                                          height: 16, 
                                          position: 'absolute', 
                                          top: 2, 
                                          left: 8, 
                                          fontSize: '0.5rem',
                                          bgcolor: stringToColor(row.created_by),
                                          border: `1px solid ${theme.palette.background.default}`,
                                          zIndex: 2
                                        }}
                                      >
                                        {creator.name ? creator.name.charAt(0).toUpperCase() : '?'}
                                      </Avatar>
                                    </Tooltip>
                                  );
                                })()}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', pl: 1, gap: 1 }}>
                                  <div {...provided.dragHandleProps} style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      cursor: 'grab', 
                                      width: 24, 
                                      height: 24,
                                      marginRight: 8
                                  }}>
                                    <Typography sx={{ color: theme.palette.text.secondary, fontSize: 13, fontWeight: 600 }}>
                                      {index + 1}
                                    </Typography>
                                  </div>
                                  <TaskRowMenu
                                    row={row}
                                    onView={() => { setReviewTask(row); setShowEmailAutomation(false); }}
                                    onMoveUp={() => handleMoveRow(row.id, 'up')}
                                    onMoveDown={() => handleMoveRow(row.id, 'down')}
                                    onMoveTop={() => handleMoveRow(row.id, 'top')}
                                    onMoveBottom={() => handleMoveRow(row.id, 'bottom')}
                                    onExportPdf={() => handleExportPdf(row)}
                                    onExportExcel={() => handleExportExcel(row)}
                                    onDelete={async () => {
                                      if (confirm('Are you sure you want to delete this task?')) {
                                        // Optimistic update
                                        setRows(prev => prev.filter(r => r.id !== row.id));
                                        // Backend call
                                        await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks/${row.id}`), {
                                          method: "DELETE",
                                        });
                                      }
                                    }}
                                  />
                                  {/* Message Icon for Chat */}
                                  <IconButton size="small" sx={{ color: '#4f51c0', '&:hover': { color: '#6c6ed6' } }} onClick={e => handleOpenChat(e, row.id, row.values.message || [], 'message')}>
                                    <ChatBubbleOutlineIcon sx={{ fontSize: 20 }} />
                                  </IconButton>
                                  {chatPopoverKey === `${row.id}-message` && chatAnchor && (
                                    <Popover
                                      open={!!chatAnchor}
                                      anchorEl={chatAnchor}
                                      onClose={handleCloseChat}
                                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                      PaperProps={{
                                        sx: { p: 0, minWidth: 380, maxWidth: 420, bgcolor: theme.palette.background.paper, borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: `1px solid ${theme.palette.divider}` }
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', flexDirection: 'column', height: 500 }}>
                                        {/* Header with Tabs */}
                                        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default }}>
                                          <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle1" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>Discussion</Typography>
                                            <IconButton size="small" onClick={handleCloseChat} sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary } }}>
                                              <span style={{ fontSize: 18 }}>✕</span>
                                            </IconButton>
                                          </Box>
                                          <Tabs 
                                            value={chatTab} 
                                            onChange={(_, v) => setChatTab(v)} 
                                            variant="fullWidth"
                                            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 1, fontSize: 13, textTransform: 'none', color: theme.palette.text.secondary }, '& .Mui-selected': { color: theme.palette.primary.main }, '& .MuiTabs-indicator': { bgcolor: theme.palette.primary.main } }}
                                          >
                                            <Tab value="chat" label="Chat" icon={<ChatBubbleOutlineIcon sx={{fontSize: 16, mb:0, mr: 0.5}}/>} iconPosition="start" />
                                            <Tab value="files" label="Files" icon={<DescriptionIcon sx={{fontSize: 16, mb:0, mr: 0.5}}/>} iconPosition="start"/>
                                            <Tab value="activity" label="Activity" icon={<HistoryIcon sx={{fontSize: 16, mb:0, mr: 0.5}}/>} iconPosition="start"/>
                                          </Tabs>
                                        </Box>

                                        {/* Content Body */}
                                        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                          
                                          {/* --- CHAT TAB --- */}
                                          {chatTab === 'chat' && (
                                            <>
                                              <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 2.5 }, py: 2, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: theme.palette.mode === 'dark' ? '#1a1b25' : '#f8f9fa' }}>
                                                {chatMessages.length === 0 ? (
                                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                                                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: theme.palette.action.selected, mb: 2 }}>
                                                        <ChatBubbleOutlineIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                                                    </Box>
                                                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>No messages yet</Typography>
                                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Start the conversation!</Typography>
                                                  </Box>
                                                ) : (
                                                  chatMessages.map(msg => {
                                                     const isMe = currentUser && msg.sender === currentUser.name;
                                                     return (
                                                    <Box key={msg.id} sx={{ 
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start', 
                                                        maxWidth: { xs: '92%', sm: '80%' }, 
                                                        display: 'flex', 
                                                        flexDirection: isMe ? 'row-reverse' : 'row',
                                                        gap: 1.5,
                                                        mb: 0.5
                                                    }}>
                                                      {!isMe && (
                                                        <Avatar
                                                            src={msg.senderAvatar ? (msg.senderAvatar.startsWith('http') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : undefined}
                                                            sx={{ 
                                                                width: 32, height: 32, fontSize: 13, 
                                                                bgcolor: theme.palette.primary.main, fontWeight: 600, mt: 0,
                                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
                                                            }}
                                                        >
                                                            {!msg.senderAvatar && (msg.sender?.[0] || 'U')}
                                                        </Avatar>
                                                      )}
                                                      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexDirection: isMe ? 'row-reverse' : 'row', px: 0.5 }}>
                                                          {!isMe && <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary, fontSize: 12 }}>{msg.sender}</Typography>}
                                                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }}>
                                                            {msg.timestamp ? new Date(msg.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                                                          </Typography>
                                                        </Box>
                                                        
                                                        <Box sx={{
                                                          bgcolor: isMe ? '#6366f1' : theme.palette.mode === 'dark' ? '#2a2b3d' : '#e2e8f0',
                                                          background: isMe ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : theme.palette.mode === 'dark' ? '#2a2b3d' : '#e2e8f0',
                                                          color: isMe ? '#fff' : theme.palette.text.primary,
                                                          p: 1.5,
                                                          px: 2,
                                                          borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                          boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.25)' : '0 2px 4px rgba(0,0,0,0.1)',
                                                          border: isMe ? 'none' : `1px solid ${theme.palette.divider}`,
                                                          maxWidth: '100%',
                                                          position: 'relative'
                                                        }}>
                                                            {msg.attachment && (
                                                                <Box component="a" href={msg.attachment.url} target="_blank" 
                                                                     onClick={(e) => e.stopPropagation()}
                                                                     sx={{ 
                                                                         display: 'flex', alignItems: 'center', gap: 1.5, 
                                                                         bgcolor: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.25)', 
                                                                         p: 1, px: 1.5, mb: msg.text ? 1 : 0, borderRadius: 2, textDecoration: 'none',
                                                                         color: isMe ? '#fff' : '#e2e8f0',
                                                                         width: '100%',
                                                                         transition: 'all 0.2s',
                                                                         border: `1px solid ${theme.palette.divider}`,
                                                                         '&:hover': { bgcolor: isMe ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.4)' }
                                                                     }}
                                                                >
                                                                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', p: 0.75, borderRadius: 1.5, display: 'flex' }}>
                                                                        <InsertDriveFileIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} />
                                                                    </Box>
                                                                    <Box sx={{minWidth: 0, flex: 1}}>
                                                                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 500 }}>{msg.attachment.name}</Typography>
                                                                        <Typography sx={{ fontSize: 10, opacity: 0.8 }}>{(msg.attachment.size ? (msg.attachment.size/1024).toFixed(0) + ' KB' : 'File')}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                          {msg.text && <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '0.01em' }}>{msg.text}</Typography>}
                                                        </Box>
                                                        
                                                        {msg.scheduledFor && (
                                                            <Chip label={`Scheduled: ${new Date(msg.scheduledFor).toLocaleString()}`} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', bgcolor: 'rgba(253, 171, 61, 0.1)', color: '#fdab3d', border: '1px solid rgba(253, 171, 61, 0.2)', fontWeight: 600 }} icon={<AccessTimeIcon style={{ color: '#fdab3d', fontSize: 12 }} />} />
                                                        )}
                                                      </Box>
                                                    </Box>
                                                  )})
                                                )}
                                                <div id="chat-bottom" ref={taskChatEndRef} />
                                              </Box>

                                              {/* Input Area */}
                                              <Box sx={{ px: 2, py: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                                                {chatTaskId && taskTypingUsers[chatTaskId]?.length > 0 && (
                                                  <Typography variant="caption" sx={{ color: '#818cf8', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, ml: 1, fontWeight: 500, fontSize: '0.75rem' }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#818cf8', display: 'inline-block' }}></span>
                                                    {taskTypingUsers[chatTaskId].join(', ')} is typing...
                                                  </Typography>
                                                )}
                                                
                                                {/* Attachments / Schedule preview */}
                                                {(chatAttachment || chatScheduledTime) && (
                                                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', px: 0.5 }}>
                                                        {chatAttachment && (
                                                            <Chip 
                                                                size="small" 
                                                                icon={<InsertDriveFileIcon style={{fontSize: 14}}/>} 
                                                                label={chatAttachment.name} 
                                                                onDelete={() => { setChatAttachment(null); if(chatFileRef.current) chatFileRef.current.value = ""; }}
                                                                sx={{ bgcolor: '#312e81', color: theme.palette.text.primary, border: '1px solid rgba(99, 102, 241, 0.3)', '& .MuiChip-deleteIcon': { color: '#a5b4fc' } }}
                                                            />
                                                        )}
                                                        {chatScheduledTime && (
                                                            <Chip 
                                                                size="small" 
                                                                icon={<AccessTimeIcon style={{fontSize: 14}}/>} 
                                                                label={`Send at: ${new Date(chatScheduledTime).toLocaleString()}`} 
                                                                onDelete={() => setChatScheduledTime("")}
                                                                sx={{ bgcolor: 'rgba(253, 171, 61, 0.15)', color: '#fdba74', border: '1px solid rgba(253, 171, 61, 0.3)', '& .MuiChip-deleteIcon': { color: '#fdba74' } }}
                                                            />
                                                        )}
                                                    </Box>
                                                )}

                                                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                  <input
                                                    type="file"
                                                    ref={chatFileRef}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setChatAttachment(e.target.files[0]);
                                                        }
                                                    }}
                                                  />
                                                  <IconButton size="small" onClick={() => chatFileRef.current?.click()} sx={{ color: '#64748b', transition: 'color 0.2s', '&:hover': { color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover } }}>
                                                      <AttachFileIcon fontSize="small" />
                                                  </IconButton>

                                                  <IconButton size="small" sx={{ color: chatScheduledTime ? '#fdab3d' : '#64748b', transition: 'color 0.2s', '&:hover': { color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover } }}
                                                      onClick={(e) => {
                                                          const input = document.getElementById('chat-schedule-input');
                                                          if(input) (input as HTMLInputElement).showPicker();
                                                      }}
                                                  >
                                                      <AccessTimeIcon fontSize="small" />
                                                      <input 
                                                          id="chat-schedule-input"
                                                          type="datetime-local" 
                                                          style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
                                                          onChange={(e) => setChatScheduledTime(e.target.value)}
                                                      />
                                                  </IconButton>

                                                      <input
                                                        value={chatInput}
                                                        onChange={e => {
                                                          setChatInput(e.target.value);
                                                          if (chatTaskId) handleTaskTyping(chatTaskId);
                                                        }}
                                                        placeholder="Type a message..."
                                                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                                        style={{
                                                          flex: 1,
                                                          backgroundColor: theme.palette.mode === 'dark' ? '#13141f' : '#f1f5f9',
                                                          border: `1px solid ${theme.palette.mode === 'dark' ? '#2d2e3d' : '#e2e8f0'}`,
                                                          borderRadius: '20px',
                                                          padding: '10px 16px',
                                                          color: theme.palette.text.primary,
                                                          fontSize: '14px',
                                                          outline: 'none',
                                                          transition: 'all 0.2s'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                                        onBlur={(e) => e.target.style.borderColor =  theme.palette.mode === 'dark' ? '#2d2e3d' : '#e2e8f0'}
                                                      />
                                                  <IconButton
                                                    onClick={() => handleSendChat()}
                                                    disabled={isSending || (!chatInput.trim() && !chatAttachment)}
                                                    size="small"
                                                    sx={{
                                                      color: (chatInput.trim() || chatAttachment) ? '#fff' : '#475569',
                                                      bgcolor: (chatInput.trim() || chatAttachment) ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                                      transition: 'all 0.2s',
                                                      '&:hover': { bgcolor: (chatInput.trim() || chatAttachment) ? '#4f46e5' : 'rgba(255,255,255,0.05)', transform: (chatInput.trim() || chatAttachment) ? 'scale(1.05)' : 'none' },
                                                      width: 32, height: 32
                                                    }}
                                                  >
                                                    {isSending ? <CircularProgress size={16} sx={{ color: theme.palette.text.primary }} /> : <SendIcon sx={{ fontSize: 16 }} />}
                                                  </IconButton>
                                                </Box>
                                              </Box>
                                            </>
                                          )}

                                          {/* --- FILES TAB --- */}
                                          {chatTab === 'files' && (
                                              <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                                                  {(() => {
                                                     const fileCols = columns.filter(c => c.type === 'Files');
                                                     let allFiles: any[] = [];
                                                     
                                                     // 1. Files from Columns
                                                     fileCols.forEach(c => {
                                                         const val = row.values[c.id];
                                                         if(Array.isArray(val)) allFiles = [...allFiles, ...val];
                                                     });

                                                     // 2. Files from Chat Messages
                                                     if (row.values.message && Array.isArray(row.values.message)) {
                                                         row.values.message.forEach((msg: any) => {
                                                             if (msg.attachment) {
                                                                 allFiles.push({
                                                                     ...msg.attachment,
                                                                     uploadedAt: msg.timestamp || new Date().toISOString()
                                                                 });
                                                             }
                                                         });
                                                     }
                                                     
                                                     // 3. Deduplicate by URL
                                                     const uniqueFiles = Array.from(new Map(allFiles.map((item) => [item.url, item])).values());
                                                     
                                                     if(uniqueFiles.length === 0) return (
                                                         <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, opacity: 0.5 }}>
                                                            <InsertDriveFileIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 1 }} />
                                                            <Typography sx={{ color: theme.palette.text.secondary }}>No files attached</Typography>
                                                         </Box>
                                                     );
                                          
                                                     return uniqueFiles.map((f, i) => (
                                                       <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1.5, p:1.5, mb:1.5, bgcolor: theme.palette.action.hover, borderRadius:2, border: '1px solid #35365a' }}>
                                                          <Box sx={{ bgcolor: 'rgba(99, 102, 241, 0.15)', p: 1, borderRadius: 1 }}>
                                                            <InsertDriveFileIcon sx={{color:'#6366f1'}} />
                                                          </Box>
                                                          <Box sx={{flex:1, minWidth:0}}>
                                                             <Typography sx={{color: theme.palette.text.primary, fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block'}} title={f.name}>{f.name || f.originalName || 'File'}</Typography>
                                                             <Typography sx={{color: theme.palette.text.secondary, fontSize:11}}>{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : 'Unknown date'}</Typography>
                                                          </Box>
                                                          <IconButton size="small" href={f.url} target="_blank" sx={{color: theme.palette.text.secondary, '&:hover':{color: theme.palette.text.primary}}}>
                                                             <Box component="span" sx={{ fontSize: 18 }}>⬇</Box>
                                                          </IconButton>
                                                       </Box>
                                                     ));
                                                  })()}
                                              </Box>
                                          )}

                                          {/* --- ACTIVITY TAB --- */}
                                          {chatTab === 'activity' && (
                                               <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                                                  {row.activity && row.activity.length > 0 ? (
                                                     [...row.activity].reverse().map((act, i) => (
                                                       <Box key={i} sx={{ mb: 2, display: 'flex', gap: 1.5, position: 'relative' }}>
                                                         <Box sx={{ position: 'absolute', left: 16, top: 24, bottom: -16, width: 1, bgcolor: '#35365a', display: i === row.activity!.length - 1 ? 'none' : 'block' }} />
                                                         <Avatar src={act.userAvatar} sx={{ width: 32, height: 32, fontSize: 12, bgcolor: '#3d3e5a', border: `2px solid ${theme.palette.background.paper}`, zIndex: 1 }}>{act.user?.[0]}</Avatar>
                                                         <Box sx={{ flex: 1 }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                                               <Typography sx={{color: theme.palette.text.primary, fontSize:13, fontWeight:600}}>{act.user}</Typography>
                                                               <Typography sx={{color: theme.palette.text.secondary, fontSize:11}}>{new Date(act.time).toLocaleString()}</Typography>
                                                            </Box>
                                                            <Typography sx={{color:'#b0b5c9', fontSize:13, bgcolor: theme.palette.background.default, p: 1, borderRadius: 2 }}>{act.text}</Typography>
                                                         </Box>
                                                       </Box>
                                                     ))
                                                  ) : (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, opacity: 0.5 }}>
                                                        <HistoryIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 1 }} />
                                                        <Typography sx={{ color: theme.palette.text.secondary }}>No activity yet</Typography>
                                                    </Box>
                                                  )}
                                               </Box>
                                          )}

                                        </Box>
                                      </Box>
                                    </Popover>
                                  )}
                                </Box>
                              </TableCell>

                              {/* Render Cells */}
                              {columns.map((col, idx) => (
                                <TableCell
                                  key={col.id}
                                  align="left"
                                  sx={{
                                    borderBottom: '1px solid #2e2f45',
                                    p: isMobile ? 0.75 : 1.5, // 12px -> 6px on mobile
                                    color: theme.palette.text.primary,
                                    fontSize: isMobile ? '0.75rem' : '0.875rem', // 14px -> 12px on mobile
                                    minWidth: isMobile ? (col.width ? col.width * 0.8 : 120) : (col.width || 150),
                                    maxWidth: isMobile ? 240 : 300,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    ...(isMobile && idx === 0 ? {
                                      position: 'sticky',
                                      left: 60, // Width of the drag handle column
                                      zIndex: 10,
                                      bgcolor: snapshot.isDragging ? theme.palette.background.paper : theme.palette.background.default,
                                      borderRight: `1px solid ${theme.palette.divider}`,
                                      boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                                    } : {
                                      position: 'relative',
                                      zIndex: 1
                                    })
                                  }}
                                >
                                  <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
                                    {renderCell(row, col)}
                                  </Box>
                                </TableCell>
                              ))}

                              {/* Empty cell for the Add Column column alignment */}
                              <TableCell sx={{ borderBottom: 'none', borderTopRightRadius: 12, borderBottomRightRadius: 12 }} />
                            </TableRow>
                          )}
                        </Draggable>
                      )})}
                      {provided.placeholder}
                    </TableBody>
                  )}}
                </Droppable>
              </Table >
            </TableContainer >
          </DragDropContext >
        ) : workspaceView === 'kanban' ? (
          <Box sx={{
            display: 'flex',
            gap: 2.5,
            height: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 2,
            px: 1,
            '::-webkit-scrollbar': { height: 8 },
            '::-webkit-scrollbar-track': { background: 'transparent' },
            '::-webkit-scrollbar-thumb': { background: '#35365a', borderRadius: 4 },
            '::-webkit-scrollbar-thumb:hover': { background: '#45466a' }
          }}>
            {(() => {
              const statusCol = columns.find(col => col.type === 'Status');
              if (!statusCol || !Array.isArray(statusCol.options)) {
                return (
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                    <Stack alignItems="center" spacing={2}>
                      <Box sx={{ bgcolor: theme.palette.background.default, p: 4, borderRadius: 4, textAlign: 'center', maxWidth: 400 }}>
                        <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.primary }}>No Status Column</Typography>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                          Please add a "Status" column to your table to visualize your tasks in Kanban view.
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              }
              // Use status options for columns
              return statusCol.options.map(opt => {
                const colTasks = filteredRows.filter(r => r.values[statusCol.id] === opt.value);
                const statusColor = opt.color || '#35365a';

                return (
                  <Paper
                    key={opt.value}
                    elevation={0}
                    sx={{
                      width: 280,
                      minWidth: 280,
                      bgcolor: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      flexShrink: 0
                    }}
                  >
                    {/* Column Header */}
                    <Box sx={{
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: theme.palette.background.default, // Header BG
                      p: 1.5,
                      borderRadius: 2,
                      borderTop: `4px solid ${statusColor}`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: theme.palette.text.primary }}>
                        {opt.value}
                      </Typography>
                      <Box sx={{
                        bgcolor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        px: 1,
                        py: 0.25,
                        minWidth: 24,
                        textAlign: 'center'
                      }}>
                        <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                          {colTasks.length}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Tasks Container */}
                    <Box sx={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      px: 0.5,
                      pb: 2,
                      '::-webkit-scrollbar': { width: 6 },
                      '::-webkit-scrollbar-track': { background: 'transparent' },
                      '::-webkit-scrollbar-thumb': { background: '#35365a', borderRadius: 3 },
                    }}>
                      {colTasks.map(task => (
                        <Paper
                          key={task.id}
                          elevation={0}
                          sx={{
                            bgcolor: theme.palette.background.default,
                            p: 2,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: '1px solid transparent',
                            borderLeft: task.created_by ? `4px solid ${stringToColor(task.created_by)}` : undefined,
                            position: 'relative',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              border: `1px solid ${statusColor}44`,
                              borderLeft: task.created_by ? `4px solid ${stringToColor(task.created_by)}` : undefined
                            }
                          }}
                          onClick={() => setReviewTask(task)}
                        >
                          {/* Creator Avatar Badge */}
                          {task.created_by && (() => {
                             const creator = tableMembers.find(m => m.id === task.created_by);
                             if (!creator) return null;
                             return (
                               <Tooltip title={`Created by ${creator.name}`}>
                                 <Avatar 
                                   src={creator.avatar} 
                                   sx={{ 
                                     width: 18, 
                                     height: 18, 
                                     position: 'absolute', 
                                     top: 6, 
                                     right: 6, 
                                     fontSize: '0.6rem',
                                     fontWeight: 'bold',
                                     bgcolor: stringToColor(task.created_by),
                                     border: `2px solid ${theme.palette.background.default}`,
                                     zIndex: 2
                                   }}
                                 >
                                   {creator.name ? creator.name.charAt(0).toUpperCase() : '?'}
                                 </Avatar>
                               </Tooltip>
                             );
                          })()}

                          {/* Primary Text (Use first column) */}
                          <Typography sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 1, lineHeight: 1.4 }}>
                            {columns[0] ? (typeof task.values[columns[0].id] === 'string' ? task.values[columns[0].id] : 'Untitled') : 'Untitled'}
                          </Typography>

                          {/* Metadata Grid */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {columns.filter(c => c.id !== statusCol.id && c.id !== columns[0]?.id && !c.hidden).slice(0, 3).map(col => {
                              const rawVal = task.values[col.id];
                              if (!rawVal) return null;

                              if (col.type === 'People' && Array.isArray(rawVal)) {
                                return (
                                  <Box key={col.id} sx={{ display: 'flex', '& > *': { ml: -0.5 }, pl: 0.5 }}>
                                    {rawVal.slice(0, 3).map((p: any, i) => (
                                      <Tooltip key={i} title={p.name || p.email}>
                                        <Avatar
                                          src={p.avatar}
                                          sx={{ width: 22, height: 22, border: `2px solid ${theme.palette.background.default}`, fontSize: '0.6rem', bgcolor: '#3d3e5a' }}
                                        >
                                          {p.name?.[0] || p.email?.[0] || '?'}
                                        </Avatar>
                                      </Tooltip>
                                    ))}
                                  </Box>
                                );
                              }

                              if (col.type === 'Priority') {
                                const prioColor = rawVal === 'High' ? '#e2445c' : rawVal === 'Medium' ? '#fdab3d' : '#00c875';
                                return (
                                  <Chip
                                    key={col.id}
                                    label={String(rawVal)}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      bgcolor: `${prioColor}33`,
                                      color: prioColor,
                                      border: `1px solid ${prioColor}44`
                                    }}
                                  />
                                );
                              }

                              if (col.type === 'Country' && countryCodeMap[String(rawVal)]) {
                                return (
                                  <Tooltip key={col.id} title={String(rawVal)}>
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                      <Flag country={countryCodeMap[String(rawVal)]} size={14} />
                                    </Box>
                                  </Tooltip>
                                );
                              }

                              // Generic fallback for other fields (Date, Text, etc)
                              if (['Date', 'Text'].includes(col.type)) {
                                return (
                                  <Typography key={col.id} variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {col.type === 'Date' && <DateRangeIcon sx={{ fontSize: 12 }} />}
                                    {String(rawVal)}
                                  </Typography>
                                );
                              }

                              return null;
                            })}
                          </Box>
                        </Paper>
                      ))}

                      <Button
                        startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                        sx={{
                          color: theme.palette.text.secondary,
                          textTransform: 'none',
                          justifyContent: 'flex-start',
                          py: 1,
                          px: 1,
                          borderRadius: 2,
                          '&:hover': { bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
                        }}
                        onClick={async () => {
                          // Create task on backend immediately
                          const initialValues = { [statusCol.id]: opt.value };
                          // Ensure other columns have default values
                          columns.forEach(c => {
                            if (!initialValues[c.id]) initialValues[c.id] = c.type === 'People' ? [] : ('' as any);
                          });

                          try {
                            const res = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ values: initialValues }),
                            });

                            if (res.ok) {
                              const createdTask = await res.json();
                              setRows(prev => [...prev, createdTask]);
                              // Open detailed view for immediate editing
                              setReviewTask(createdTask);
                            }
                          } catch (e) {
                            console.error("Failed to create task", e);
                          }
                        }}
                      >
                        New Task
                      </Button>
                    </Box>
                  </Paper>
                );
              });
            })()}
          </Box>
        ) : workspaceView === 'calendar' ? (
          <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            {/* Calendar Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>{currentDate.format('MMMM YYYY')}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => setCurrentDate(curr => curr.subtract(1, 'month'))} sx={{ color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover, '&:hover': { bgcolor: '#3d3e5a' } }}>
                    <Typography variant="h6">{'<'}</Typography>
                  </IconButton>
                  <Button onClick={() => setCurrentDate(dayjs())} sx={{ color: theme.palette.text.primary, textTransform: 'none' }}>
                    Today
                  </Button>
                  <IconButton onClick={() => setCurrentDate(curr => curr.add(1, 'month'))} sx={{ color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover, '&:hover': { bgcolor: '#3d3e5a' } }}>
                    <Typography variant="h6">{'>'}</Typography>
                  </IconButton>
                </Box>
              </Box>
              {/* Filter/Legend could go here */}
            </Box>

            {/* Calendar Grid */}
            <Box sx={{ flex: 1, bgcolor: theme.palette.background.default, borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #35365a' }}>
              {(() => {
                const dateCol = columns.find(c => c.type === 'Date');
                const statusCol = columns.find(c => c.type === 'Status');
                if (!dateCol) return (
                  <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography sx={{ color: theme.palette.text.secondary }}>No Date column found. Please add a Date column to use Calendar view.</Typography>
                  </Box>
                );

                const startOfMonth = currentDate.startOf('month');
                const endOfMonth = currentDate.endOf('month');
                const startDate = startOfMonth.startOf('week');
                const endDate = endOfMonth.endOf('week');

                const calendarDays = [];
                let day = startDate;
                while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
                  calendarDays.push(day);
                  day = day.add(1, 'day');
                }

                const weeks = [];
                for (let i = 0; i < calendarDays.length; i += 7) {
                  weeks.push(calendarDays.slice(i, i + 7));
                }

                return (
                  <>
                    {/* Weekday Headers */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #35365a' }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <Box key={d} sx={{ p: 1.5, textAlign: 'center', borderRight: '1px solid #35365a', '&:last-child': { borderRight: 'none' } }}>
                          <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>{d}</Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Weeks */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {weeks.map((week, wIdx) => (
                        <Box key={wIdx} sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          flex: 1,
                          minHeight: 100,
                          borderBottom: wIdx === weeks.length - 1 ? 'none' : '1px solid #35365a'
                        }}>
                          {week.map((date, dIdx) => {
                            const isCurrentMonth = date.month() === currentDate.month();
                            const isToday = date.isSame(dayjs(), 'day');
                            const dayTasks = filteredRows.filter(r => {
                              const rDate = r.values[dateCol.id];
                              return rDate && dayjs(rDate).isSame(date, 'day');
                            });

                            return (
                              <Box
                                key={dIdx}
                                sx={{
                                  borderRight: dIdx === 6 ? 'none' : '1px solid #35365a',
                                  bgcolor: isCurrentMonth ? 'transparent' : 'rgba(0,0,0,0.15)',
                                  p: 1,
                                  position: 'relative',
                                  transition: 'background-color 0.2s',
                                  '&:hover': { bgcolor: isCurrentMonth ? '#2c2d4a' : 'rgba(0,0,0,0.2)' }
                                }}
                                onClick={() => {
                                  // Add new task on this date
                                  // Logic to open modal or prepopulate could go here
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                  <Typography sx={{
                                    fontSize: '0.85rem',
                                    fontWeight: isToday ? 700 : 400,
                                    width: 24,
                                    height: 24,
                                    lineHeight: '24px',
                                    textAlign: 'center',
                                    borderRadius: '50%',
                                    bgcolor: isToday ? '#e2445c' : 'transparent',
                                    color: isToday ? '#fff' : isCurrentMonth ? '#fff' : '#5c5e80'
                                  }}>
                                    {date.date()}
                                  </Typography>
                                </Box>

                                <Stack spacing={0.5}>
                                  {dayTasks.map(task => {
                                    const statusVal = statusCol ? task.values[statusCol.id] : null;
                                    const statusOpt = statusCol?.options?.find(o => o.value === statusVal);
                                    const borderLeftColor = statusOpt?.color || '#0073ea';

                                    return (
                                      <Paper
                                        key={task.id}
                                        elevation={0}
                                        sx={{
                                          p: 0.5,
                                          px: 1,
                                          bgcolor: '#35365a',
                                          borderLeft: `3px solid ${borderLeftColor}`,
                                          cursor: 'pointer',
                                          '&:hover': { filter: 'brightness(1.2)' }
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReviewTask(task);
                                        }}
                                      >
                                        <Typography noWrap sx={{ fontSize: '0.75rem', color: theme.palette.text.primary }}>
                                          {columns[0] ? task.values[columns[0].id] : 'Untitled'}
                                        </Typography>
                                      </Paper>
                                    );
                                  })}
                                </Stack>
                              </Box>
                            );
                          })}
                        </Box>
                      ))}
                    </Box>
                  </>
                );
              })()}
            </Box>
          </Box>
        ) : workspaceView === 'doc' ? (
          <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ bgcolor: theme.palette.background.default, borderRadius: 4, p: 4, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>
                  Workspace Document
                </Typography>
                <Typography variant="caption" sx={{ color: docSaving ? '#fdab3d' : '#00c875' }}>
                  {docSaving ? 'Saving...' : 'Saved'}
                </Typography>
              </Box>
              <TextField
                multiline
                fullWidth
                variant="outlined"
                placeholder="Write your project documentation, notes, or ideas here..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                sx={{
                  flex: 1,
                  bgcolor: 'transparent',
                  '& .MuiOutlinedInput-root': {
                    height: '100%',
                    alignItems: 'flex-start',
                    color: theme.palette.text.primary,
                    fontSize: '1.1rem',
                    lineHeight: 1.6,
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' }
                  }
                }}
              />
            </Box>
          </Box>
        ) : workspaceView === 'gantt' ? (
          <Box sx={{ mt: 4, mb: 4 }}>
            {/* Find Timeline column */}
            {(() => {
              const timelineCol = columns.find(col => col.type === 'Timeline');
              if (!timelineCol) {
                return <Typography sx={{ color: theme.palette.text.secondary }}>No Timeline column found. Gantt requires a Timeline column.</Typography>;
              }
              // Find min/max dates
              const tasksWithTimeline = filteredRows.filter(row => {
                const val = row.values[timelineCol.id];
                return val && val.start && val.end;
              });
              if (tasksWithTimeline.length === 0) {
                return <Typography sx={{ color: theme.palette.text.secondary }}>No tasks with timeline data.</Typography>;
              }
              const minDate = Math.min(...tasksWithTimeline.map(row => new Date(row.values[timelineCol.id].start).getTime()));
              const maxDate = Math.max(...tasksWithTimeline.map(row => new Date(row.values[timelineCol.id].end).getTime()));
              // Render Gantt chart
              return (
                <Box sx={{ bgcolor: theme.palette.background.default, borderRadius: 3, p: 3, boxShadow: 4 }}>
                  <Typography variant="h6" sx={{ color: '#fdab3d', fontWeight: 700, mb: 2 }}>Gantt Chart</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {tasksWithTimeline.map(row => {
                      const start = new Date(row.values[timelineCol.id].start).getTime();
                      const end = new Date(row.values[timelineCol.id].end).getTime();
                      const total = maxDate - minDate;
                      const left = ((start - minDate) / total) * 100;
                      const width = ((end - start) / total) * 100;
                      return (
                        <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ color: theme.palette.text.primary, minWidth: 120 }}>{columns[0]?.name}: {row.values[columns[0]?.id]}</Typography>
                          <Box sx={{ position: 'relative', flex: 1, height: 24, bgcolor: '#35365a', borderRadius: 2 }}>
                            <Box sx={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', bgcolor: '#fdab3d', borderRadius: 2, boxShadow: '0 2px 8px #fdab3d44' }} />
                          </Box>
                          <Typography sx={{ color: theme.palette.text.secondary, minWidth: 120 }}>{row.values[timelineCol.id].start} - {row.values[timelineCol.id].end}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })()}
          </Box>
        ) : workspaceView === 'gallery' ? (
          <Box sx={{ mt: 4, mb: 4 }}>
            {/* File Gallery */}
            <Box sx={{ bgcolor: theme.palette.background.default, borderRadius: 4, p: 4, display: 'flex', flexDirection: 'column', gap: 3, boxShadow: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>File Gallery</Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  All files across your board
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
                {/* Collect all files */}
                {(() => {
                  let allFiles: any[] = [];
                  const fileCols = columns.filter(c => c.type === 'Files');

                  filteredRows.forEach(row => {
                    fileCols.forEach(col => {
                      const cellFiles = Array.isArray(row.values[col.id]) ? row.values[col.id] : [];
                      cellFiles.forEach((f: any) => {
                        // Find task name (first column usually)
                        const taskName = columns.length > 0 ? row.values[columns[0].id] : 'Untitled';
                        allFiles.push({ file: f, rowId: row.id, colId: col.id, taskName });
                      });
                    });
                  });

                  if (allFiles.length === 0) {
                    return (
                      <Box sx={{ gridColumn: '1 / -1', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 64, color: '#35365a' }} />
                        <Typography sx={{ color: theme.palette.text.secondary }}>No files uploaded yet.</Typography>
                      </Box>
                    );
                  }

                  return allFiles.map((item, idx) => {
                    const isImage = (item.file.type && item.file.type.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.name);
                    const fileUrl = item.file.url ? (item.file.url.startsWith('http') ? item.file.url : `${SERVER_URL}${item.file.url}`) : null;

                    return (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                          bgcolor: theme.palette.action.hover,
                          borderRadius: 3,
                          overflow: 'hidden',
                          position: 'relative',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1 }
                        }}
                      >
                        {/* Preview Area */}
                        <Box
                          sx={{
                            height: 140,
                            bgcolor: theme.palette.background.paper,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            borderBottom: '1px solid #35365a'
                          }}
                          onClick={() => handleFileClick(item.file, item.rowId, item.colId)}
                        >
                          {isImage && fileUrl ? (
                            <img
                              src={fileUrl}
                              alt={item.file.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <InsertDriveFileIcon sx={{ fontSize: 48, color: '#579bfc' }} />
                          )}
                        </Box>

                        {/* Info Area */}
                        <Box sx={{ p: 2 }}>
                          <Typography noWrap variant="subtitle2" sx={{ color: theme.palette.text.primary, fontWeight: 600, mb: 0.5 }} title={item.file.name}>
                            {item.file.name}
                          </Typography>
                          <Typography noWrap variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                            {item.taskName}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#5c5e80', fontWeight: 600 }}>
                              {item.file.size ? (item.file.size / 1024).toFixed(0) + ' KB' : ''}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleFileClick(item.file, item.rowId, item.colId)}
                              sx={{ color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover, '&:hover': { bgcolor: '#0073ea', color: theme.palette.text.primary } }}
                            >
                              <span style={{ fontSize: 16 }}>↗</span>
                            </IconButton>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  });
                })()}
              </Box>
            </Box>
          </Box>
        ) : null
      }

      {/* Task Review Drawer/Dialog with Email Automation */}
      <Dialog
        open={!!reviewTask}
        onClose={handleCloseReview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, lg: 2 },
            width: '100%',
            maxWidth: { xs: '100vw', lg: 1100 },
            height: '80vh', // Fixed height to ensure internal scrolling works
            bgcolor: theme.palette.background.paper, // Modern Dark Neutral
            color: theme.palette.text.primary,
            borderRadius: { xs: 0, lg: 4 },
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            p: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            '@media (max-width: 600px)': {
              maxWidth: '100vw',
              m: 0,
              borderRadius: 0,
              height: '100%'
            },
          },
        }}
      >
        <DialogTitle sx={{
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: 4,
          py: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2
        }}>
          <Typography component="div" variant="h6" sx={{ fontWeight: 700, fontSize: 20, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {reviewTask?.values && columns.length > 0 ? (reviewTask.values[columns[0].id] || 'Task Details') : 'Task Details'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Mobile Navigation Toggle (Pill Style) */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, bgcolor: theme.palette.action.hover, borderRadius: 99, p: 0.5, gap: 0.5 }}>
              {(['details', 'chat', 'files', 'activity'] as const).map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  size="small"
                  sx={{
                    color: mobileTab === tab ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                    bgcolor: mobileTab === tab ? theme.palette.primary.main : 'transparent',
                    minWidth: 'auto',
                    borderRadius: 99,
                    px: 2,
                    py: 0.5,
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: 'capitalize',
                    '&:hover': { bgcolor: mobileTab === tab ? theme.palette.primary.dark : theme.palette.action.hover }
                  }}
                >
                  {tab}
                </Button>
              ))}
            </Box>
            <IconButton onClick={handleCloseReview} size="small" sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: 'rgba(255,255,255,0.1)' } }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>×</span>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flex: 1, overflow: 'hidden' }}>

          {/* Left Panel: Task Properties */}
          <Box
            hidden={isMobile && mobileTab !== 'details'}
            sx={{
              flex: { xs: 1, md: 7 },
              p: { xs: 3, md: 4 },
              overflowY: 'auto',
              borderRight: { md: `1px solid ${theme.palette.divider}` },
              maxHeight: { xs: '100%', md: '100%' },
              display: { xs: (isMobile && mobileTab === 'details') ? 'block' : (isMobile ? 'none' : 'block'), md: 'block' },
              width: { xs: '100%', md: 'auto' },
              bgcolor: theme.palette.background.paper
            }}>
            {reviewTask && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
                {columns.map((col) => {
                  return (
                    <Box key={col.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', pl: 0.5 }}>
                        {col.name}
                      </Typography>

                      {/* Text / Link / Number */}
                      {(col.type === undefined || col.type === "Text" || col.type === "Link" || col.type === "Number" || col.type === "Country") && (
                        <Autocomplete
                          freeSolo
                          disableClearable
                          options={Array.from(new Set(rows.map(r => r.values[col.id]).filter(v => v && typeof v === 'string' && v.trim() !== ''))) as string[]}
                          value={reviewTask.values[col.id] || ''}
                          onInputChange={(e, val) => {
                             setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: val } }) : null);
                          }}
                          onChange={(e, val) => {
                             if (val) {
                                setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: val } }) : null);
                                handleCellSave(reviewTask.id, col.id, col.type, val);
                             }
                          }}
                          renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                variant="standard"
                                placeholder="Empty"
                                onBlur={(e) => {
                                    handleCellSave(reviewTask.id, col.id, col.type, e.target.value);
                                }}
                                InputProps={{ 
                                    ...params.InputProps, 
                                    disableUnderline: true,
                                    sx: {
                                        color: theme.palette.text.primary,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        bgcolor: theme.palette.action.hover,
                                        borderRadius: 2,
                                        px: 1.5,
                                        py: 0.75,
                                        border: '1px solid transparent',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.palette.divider}` },
                                        '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid #6366f1', boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)' },
                                    }
                                }}
                            />
                          )}
                        slotProps={{
                          paper: {
                            sx: {
                                bgcolor: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 2,
                                mt: 1,
                                '& .MuiMenuItem-root': {
                                    '&:hover': { bgcolor: theme.palette.action.hover },
                                    '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)' }
                                }
                            }
                          }}}
                        />
                      )}

                      {/* Status / Dropdown / Priority */}
                      {(col.type === "Status" || col.type === "Dropdown" || col.type === "Priority" || col.id === "priority") && (
                        <Select
                          fullWidth
                          variant="standard"
                          disableUnderline
                          displayEmpty
                          value={reviewTask.values[col.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: val } }) : null);
                          handleCellSave(reviewTask.id, col.id, col.type, val);
                        }}
                        renderValue={(selected) => {
                           if (!selected || selected === "") return <Typography sx={{ color: theme.palette.text.secondary, fontStyle: 'italic', fontSize: 13 }}>Select option</Typography>;
                           
                           const options = col.options || (col.id === 'priority' ? [{ value: 'High', color: theme.palette.error.main }, { value: 'Medium', color: '#fdab3d' }, { value: 'Low', color: '#00c875' }] : []);
                           const selectedOpt = options.find((opt: any) => opt.value === selected);
                           
                           return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden', width: '100%', minWidth: 0, paddingRight: 4 }}>
                                 <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selectedOpt?.color || theme.palette.text.secondary }} />
                                 <Typography sx={{ color: theme.palette.text.primary, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected}</Typography>
                              </Box>
                           );
                        }}
                        sx={{ bgcolor: theme.palette.background.paper, borderRadius: 1.5, px: 2, py: 1, border: `1px solid ${theme.palette.divider}` }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: 2 } } }}
                      >


                          <MenuItem value="" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic', fontSize: 13 }}>Select option</MenuItem>
                          {(col.options || (col.id === 'priority' ? [{ value: 'High', color: theme.palette.error.main }, { value: 'Medium', color: '#fdab3d' }, { value: 'Low', color: '#00c875' }] : [])).map((opt) => (
                            <MenuItem
                              key={opt.value}
                              value={opt.value}
                              sx={{
                                color: theme.palette.text.primary,
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.3)' } }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden', width: '100%' }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color || '#ccc', flexShrink: 0 }} />
                                <Typography noWrap sx={{ fontSize: 14 }}>{opt.value}</Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      )}

                      {/* Date */}
                      {col.type === "Date" && (
                        <Box sx={{ width: '100%', height: 36, bgcolor: theme.palette.action.hover, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
                          <DateCellEditor
                            initialValue={reviewTask.values[col.id] || ''}
                            onSave={(val) => {
                              const dateStr = val && dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : '';
                              setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: dateStr } }) : null);
                              handleCellSave(reviewTask.id, col.id, col.type, dateStr);
                            }}
                          />
                        </Box>
                      )}

                      {/* Checkbox */}
                      {col.type === "Checkbox" && (
                        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: theme.palette.action.hover, p: 1, borderRadius: 2 }}>
                          <Checkbox
                            checked={Boolean(reviewTask.values[col.id])}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: val } }) : null);
                              handleCellSave(reviewTask.id, col.id, col.type, val);
                            }}
                            sx={{ color: theme.palette.text.secondary, '&.Mui-checked': { color: theme.palette.primary.main }, p: 0.5 }}
                          />
                          <Typography sx={{ ml: 1.5, color: Boolean(reviewTask.values[col.id]) ? '#fff' : '#9CA3AF', fontSize: 14 }}>
                            {Boolean(reviewTask.values[col.id]) ? 'Completed' : 'To Do'}
                          </Typography>
                        </Box>
                      )}

                      {/* People */}
                      {col.type === "People" && (
                        <Box sx={{ bgcolor: theme.palette.action.hover, borderRadius: 2, p: 0.5 }}>
                          <PeopleSelector
                            value={Array.isArray(reviewTask.values[col.id]) ? reviewTask.values[col.id] : []}
                            tableId={tableId}
                            onChange={(newPeople: Person[]) => {
                              if (reviewTask) {
                                  const updatedReviewTask = { 
                                      ...reviewTask, 
                                      values: { ...reviewTask.values, [col.id]: newPeople } 
                                  };
                                  setReviewTask(updatedReviewTask);
                                  handleCellSave(reviewTask.id, col.id, col.type, newPeople);
                              }
                            }}
                          />
                        </Box>
                      )}

                      {/* Timeline */}
                      {col.type === "Timeline" && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: theme.palette.action.hover, p: 1, borderRadius: 2 }}>
                          <input
                            type="date"
                            value={reviewTask.values[col.id]?.start || ''}
                            onChange={(e) => {
                              const val = { ...(reviewTask.values[col.id] || {}), start: e.target.value };
                              setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: val } }) : null);
                              handleCellSave(reviewTask.id, col.id, col.type, val);
                            }}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              background: 'transparent',
                              border: 'none',
                              color: theme.palette.text.primary,
                              fontSize: 13
                            }}
                          />
                          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 12 }}>to</Typography>
                          <input
                            type="date"
                            value={reviewTask.values[col.id]?.end || ''}
                            onChange={(e) => {
                              const val = { ...(reviewTask.values[col.id] || {}), end: e.target.value };
                              setReviewTask(prev => prev ? ({ ...prev, values: { ...prev.values, [col.id]: val } }) : null);
                              handleCellSave(reviewTask.id, col.id, col.type, val);
                            }}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              background: 'transparent',
                              border: 'none',
                              color: theme.palette.text.primary,
                              fontSize: 13
                            }}
                          />
                        </Box>
                      )}

                      {/* Files */}
                      {col.type === "Files" && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: theme.palette.action.hover, p: 1.5, borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {(Array.isArray(reviewTask.values[col.id]) ? reviewTask.values[col.id] : []).map((file: any, index: number) => (
                              <Chip
                                key={index}
                                icon={<InsertDriveFileIcon sx={{ fontSize: 16, color: '#818CF8' }} />}
                                label={file.name}
                                onClick={() => handleFileClick(file, reviewTask.id, col.id)}
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.1)',
                                  color: theme.palette.text.primary,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                                }}
                              />
                            ))}
                            {(!reviewTask.values[col.id] || reviewTask.values[col.id].length === 0) && (
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>No files attached</Typography>
                            )}
                          </Box>
                          <Button
                            variant="outlined"
                            startIcon={<AttachFileIcon />}
                            component="label"
                            size="small"
                            sx={{
                              width: 'fit-content',
                              color: theme.palette.text.secondary,
                              borderColor: 'rgba(255,255,255,0.1)',
                              textTransform: 'none',
                              borderRadius: 2,
                              py: 0.5,
                              '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: theme.palette.action.hover, color: theme.palette.text.primary }
                            }}
                          >
                            Upload File
                            <input
                              type="file"
                              multiple
                              hidden
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleFileUpload(reviewTask.id, col.id, e.target.files);
                                }
                                // Reset
                                e.target.value = '';
                              }}
                            />
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )
                })}

                <Box sx={{ mt: 2, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
                  
                </Box>
              </Box>
            )}
            {reviewTask && showEmailAutomation && (
              <Box>
                {automationLoading && <Typography sx={{ color: theme.palette.text.secondary, mb: 2 }}>Loading automation settings...</Typography>}
                <Typography variant="h6" mb={3} sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>Email Automation</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, p: 2, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
                  <Typography sx={{ color: '#D1D5DB', fontWeight: 600, mr: 2, flex: 1 }}>Enable Automation for this Task</Typography>
                  <Switch
                    checked={automationEnabled}
                    onChange={e => setAutomationEnabled(e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#818CF8' }, '& .MuiSwitch-track': { bgcolor: '#4B5563' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#818CF8' } }}
                  />
                </Box>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="email-trigger-col-label" sx={{ color: theme.palette.text.secondary, '&.Mui-focused': { color: '#818CF8' } }}>Send email when column is edited</InputLabel>
                  <Select
                    labelId="email-trigger-col-label"
                    variant="outlined"
                    value={emailTriggerCol || ''}
                    label="Send email when column is edited"
                    onChange={e => setEmailTriggerCol(e.target.value)}
                    sx={{
                      color: theme.palette.text.primary,
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#818CF8' },
                      '& .MuiSvgIcon-root': { color: theme.palette.text.secondary }
                    }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, mt: 1 } } }}
                  >
                    {columns.map(col => (
                      <MenuItem key={col.id} value={col.id} sx={{ color: theme.palette.text.primary, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)' } }}>{col.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="email-cols-label" sx={{ color: theme.palette.text.secondary, '&.Mui-focused': { color: '#818CF8' } }}>Columns to include in email</InputLabel>
                  <Select
                    labelId="email-cols-label"
                    multiple
                    variant="outlined"
                    value={emailCols}
                    onChange={(e) => setEmailCols(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    renderValue={(selected) => columns.filter((col) => selected.includes(col.id)).map((col) => col.name).join(', ')}
                    sx={{
                      color: theme.palette.text.primary,
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#818CF8' },
                      '& .MuiSvgIcon-root': { color: theme.palette.text.secondary }
                    }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, mt: 1 } } }}
                  >
                    {columns.map((col) => (
                      <MenuItem key={col.id} value={col.id} sx={{ color: theme.palette.text.primary, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)' } }}>
                        <Checkbox checked={emailCols.indexOf(col.id) > -1} sx={{ color: '#818CF8' }} />
                        <ListItemText primary={col.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="email-recipients-label" sx={{ color: theme.palette.text.secondary, '&.Mui-focused': { color: '#818CF8' } }}>Recipients</InputLabel>
                  <Select
                    labelId="email-recipients-label"
                    multiple
                    variant="outlined"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    renderValue={(selected) => selected.map((email: string) => {
                      const person = peopleOptions.find((p: { name: string; email: string }) => p.email === email);
                      return person ? person.name : email;
                    }).join(', ')}
                    sx={{
                      color: theme.palette.text.primary,
                      bgcolor: theme.palette.action.hover,
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#818CF8' },
                      '& .MuiSvgIcon-root': { color: theme.palette.text.secondary }
                    }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, mt: 1 } } }}
                  >
                    {peopleOptions.map((person: { name: string; email: string }) => (
                      <MenuItem key={person.email} value={person.email} sx={{ color: theme.palette.text.primary, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }, '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.2)' } }}>
                        <Checkbox checked={emailRecipients.indexOf(person.email) > -1} sx={{ color: '#818CF8' }} />
                        <ListItemText primary={person.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                  <Button variant="text" onClick={() => setShowEmailAutomation(false)} sx={{ color: theme.palette.text.secondary, borderRadius: 2, fontWeight: 600, px: 3, py: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: theme.palette.text.primary } }}>Back</Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ bgcolor: '#818CF8', color: theme.palette.text.primary, borderRadius: 2.5, fontWeight: 700, px: 4, py: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#6366F1', boxShadow: 'none' } }}
                    onClick={async () => {
                      // Save automation settings to backend
                      const body = {
                        enabled: automationEnabled,
                        triggerCol: emailTriggerCol,
                        cols: emailCols,
                        recipients: emailRecipients
                      };
                      if (reviewTask && reviewTask.id && reviewTask.id !== 'placeholder') {
                        (body as any).taskId = reviewTask.id;
                      }
                      await authenticatedFetch(getApiUrl(`/automation/${tableId}`), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                      });
                      setShowEmailAutomation(false);
                    }}
                  >
                    Save Automation
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* Right Panel: Discussion / Chat / Files / Activity */}
          <Box
            hidden={isMobile && mobileTab === 'details'}
            sx={{
              flex: { xs: 1, md: 5 },
              display: { xs: (isMobile && mobileTab !== 'details') ? 'flex' : (isMobile ? 'none' : 'flex'), md: 'flex' },
              flexDirection: 'column',
              bgcolor: theme.palette.background.paper,
              p: 0,
              height: '100%',
              overflow: 'hidden',
              width: { xs: '100%', md: 'auto' },
              borderLeft: { md: `1px solid ${theme.palette.divider}` }
            }}>
            {/* Desktop Right Panel Tabs */}
            <Box sx={{ p: 0.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
              {['chat', 'files', 'activity'].map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setRightPanelTab(tab as any)}
                  startIcon={
                    tab === 'chat' ? <ChatBubbleOutlineIcon fontSize="small" /> :
                      tab === 'files' ? <AttachFileIcon fontSize="small" /> :
                        <HistoryIcon fontSize="small" />
                  }
                  sx={{
                    flex: 1,
                    color: rightPanelTab === tab ? '#818CF8' : theme.palette.text.secondary,
                    bgcolor: rightPanelTab === tab ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: 'capitalize',
                    fontWeight: 600,
                    fontSize: 14,
                    '&:hover': { bgcolor: rightPanelTab === tab ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)', color: rightPanelTab === tab ? '#818CF8' : theme.palette.text.primary }
                  }}
                >
                  {tab}
                </Button>
              ))}
            </Box>

            {/* Mobile Header (For Right Panel Context) */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.default }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16, color: theme.palette.text.primary }}>
                {(mobileTab === 'chat' || rightPanelTab === 'chat') && 'Discussion'}
                {(mobileTab === 'files' || rightPanelTab === 'files') && 'Files'}
                {(mobileTab === 'activity' || rightPanelTab === 'activity') && 'Activity Log'}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {(mobileTab === 'chat' || rightPanelTab === 'chat') && 'Updates related to this task'}
                {(mobileTab === 'files' || rightPanelTab === 'files') && 'Attachments and documents'}
                {(mobileTab === 'activity' || rightPanelTab === 'activity') && 'History of changes'}
              </Typography>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, overflow: 'hidden', p: 0, display: 'flex', flexDirection: 'column' }}>

              {/* --- CHAT VIEW --- */}
              {((isMobile && mobileTab === 'chat') || (!isMobile && rightPanelTab === 'chat')) && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {(!reviewTask?.values.message || reviewTask.values.message.length === 0) ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7, py: 8 }}>
                        <Box sx={{ p: 2, borderRadius: '50%', bgcolor: theme.palette.action.hover, mb: 2 }}>
                          <ChatBubbleOutlineIcon sx={{ fontSize: 32, color: theme.palette.text.secondary }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>No updates yet</Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Start the conversation below</Typography>
                      </Box>
                    ) : (
                      (reviewTask.values.message || []).map((msg: any) => {
                        const isMe = currentUser && msg.sender === currentUser.name;
                        return (
                        <Box key={msg.id} sx={{ 
                            alignSelf: isMe ? 'flex-end' : 'flex-start', 
                            maxWidth: { xs: '90%', sm: '80%' }, 
                            display: 'flex', 
                            flexDirection: isMe ? 'row-reverse' : 'row',
                            gap: 1.5,
                            mb: 1
                        }}>
                          {!isMe && (
                            <Avatar
                              src={msg.senderAvatar ? (msg.senderAvatar.startsWith('http') ? msg.senderAvatar : `${SERVER_URL}${msg.senderAvatar}`) : undefined}
                              sx={{ 
                                  width: 32, height: 32, fontSize: 13, 
                                  bgcolor: theme.palette.primary.main, fontWeight: 600, mt: 0,
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
                              }}
                            >
                              {!msg.senderAvatar && (msg.sender?.[0] || 'U')}
                            </Avatar>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexDirection: isMe ? 'row-reverse' : 'row', px: 0.5 }}>
                                {!isMe && <Typography variant="caption" sx={{ fontWeight: 600, color: '#cbd5e1', fontSize: 12 }}>{msg.sender}</Typography>}
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                                </Typography>
                            </Box>

                            <Box sx={{
                                bgcolor: isMe ? '#6366f1' : '#2a2b3d',
                                background: isMe ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#2a2b3d',
                                color: isMe ? '#fff' : '#e2e8f0',
                                p: 1.5,
                                px: 2,
                                borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                boxShadow: isMe ? '0 4px 12px rgba(99, 102, 241, 0.25)' : '0 1px 3px rgba(0,0,0,0.2)',
                                border: isMe ? 'none' : `1px solid ${theme.palette.divider}`,
                                maxWidth: '100%',
                                position: 'relative'
                            }}>
                                {msg.attachment && (
                                    <Box component="a" href={msg.attachment.url} target="_blank" 
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ 
                                                display: 'flex', alignItems: 'center', gap: 1.5, 
                                                bgcolor: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.25)', 
                                                p: 1, px: 1.5, mb: msg.text ? 1 : 0, borderRadius: 2, textDecoration: 'none',
                                                color: isMe ? '#fff' : '#e2e8f0',
                                                width: '100%',
                                                transition: 'all 0.2s',
                                                border: `1px solid ${theme.palette.divider}`,
                                                '&:hover': { bgcolor: isMe ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.4)' }
                                            }}
                                    >
                                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', p: 0.75, borderRadius: 1.5, display: 'flex' }}>
                                            <InsertDriveFileIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} />
                                        </Box>
                                        <Box sx={{minWidth: 0, flex: 1}}>
                                            <Typography noWrap sx={{ fontSize: 13, fontWeight: 500 }}>{msg.attachment.name}</Typography>
                                            <Typography sx={{ fontSize: 10, opacity: 0.8 }}>{(msg.attachment.size ? (msg.attachment.size/1024).toFixed(0) + ' KB' : 'File')}</Typography>
                                        </Box>
                                    </Box>
                                )}
                              {msg.text && <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '0.01em' }}>{msg.text}</Typography>}
                            </Box>

                            {msg.scheduledFor && (
                                <Chip label={`Scheduled: ${new Date(msg.scheduledFor).toLocaleString()}`} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', bgcolor: 'rgba(253, 171, 61, 0.1)', color: '#fdab3d', border: '1px solid rgba(253, 171, 61, 0.2)', fontWeight: 600 }} icon={<AccessTimeIcon style={{ color: '#fdab3d', fontSize: 12 }} />} />
                            )}
                          </Box>
                        </Box>
                      )})
                    )}
                    <div ref={taskDetailsChatEndRef} />
                  </Box>
                  <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                    {reviewTask && taskTypingUsers[reviewTask.id] && taskTypingUsers[reviewTask.id].length > 0 && (
                      <Typography variant="caption" sx={{ color: '#818cf8', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, ml: 1, fontWeight: 500, fontSize: '0.75rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#818cf8', display: 'inline-block' }}></span>
                        {taskTypingUsers[reviewTask.id].join(', ')} is typing...
                      </Typography>
                    )}
                    
                    {/* Attachments / Schedule preview (Copied from Popover) */}
                    {(chatAttachment || chatScheduledTime) && (
                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', px: 0.5 }}>
                            {chatAttachment && (
                                <Chip 
                                    size="small" 
                                    icon={<InsertDriveFileIcon style={{fontSize: 14}}/>} 
                                    label={chatAttachment.name} 
                                    onDelete={() => { setChatAttachment(null); if(chatFileRef.current) chatFileRef.current.value = ""; }}
                                    sx={{ bgcolor: '#312e81', color: theme.palette.text.primary, border: '1px solid rgba(99, 102, 241, 0.3)', '& .MuiChip-deleteIcon': { color: '#a5b4fc' } }}
                                />
                            )}
                            {chatScheduledTime && (
                                <Chip 
                                    size="small" 
                                    icon={<AccessTimeIcon style={{fontSize: 14}}/>} 
                                    label={`Send at: ${new Date(chatScheduledTime).toLocaleString()}`} 
                                    onDelete={() => setChatScheduledTime("")}
                                    sx={{ bgcolor: 'rgba(253, 171, 61, 0.15)', color: '#fdba74', border: '1px solid rgba(253, 171, 61, 0.3)', '& .MuiChip-deleteIcon': { color: '#fdba74' } }}
                                />
                            )}
                        </Box>
                    )}

                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        type="file"
                        ref={chatFileRef}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setChatAttachment(e.target.files[0]);
                            }
                        }}
                      />
                      <IconButton size="small" onClick={() => chatFileRef.current?.click()} sx={{ color: '#64748b', transition: 'color 0.2s', '&:hover': { color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover } }}>
                          <AttachFileIcon fontSize="small" />
                      </IconButton>

                      <IconButton size="small" sx={{ color: chatScheduledTime ? '#fdab3d' : '#64748b', transition: 'color 0.2s', '&:hover': { color: theme.palette.text.secondary, bgcolor: theme.palette.action.hover } }}
                          onClick={(e) => {
                              const input = document.getElementById('chat-schedule-input-details');
                              if(input) (input as HTMLInputElement).showPicker();
                          }}
                      >
                          <AccessTimeIcon fontSize="small" />
                          <input 
                              id="chat-schedule-input-details"
                              type="datetime-local" 
                              style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
                              onChange={(e) => setChatScheduledTime(e.target.value)}
                          />
                      </IconButton>

                      <input
                        value={chatInput}
                        onChange={e => {
                          setChatInput(e.target.value);
                          if (reviewTask) handleTaskTyping(reviewTask.id);
                        }}
                        placeholder="Write an update..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (chatInput.trim() || chatAttachment) && reviewTask && !isSending) {
                            handleSendChat(reviewTask.id);
                          }
                        }}
                        style={{
                          flex: 1, 
                          backgroundColor: '#13141f',
                          border: '1px solid #2d2e3d',
                          borderRadius: '20px',
                          padding: '10px 16px',
                          color: '#e2e8f0',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#2d2e3d'}
                      />
                      <IconButton
                        onClick={async () => {
                           if ((chatInput.trim() || chatAttachment) && reviewTask) {
                                handleSendChat(reviewTask.id);
                           }
                        }}
                        disabled={isSending || (!chatInput.trim() && !chatAttachment)}
                        size="medium"
                        sx={{
                          color: (chatInput.trim() || chatAttachment) ? '#fff' : theme.palette.text.secondary,
                          width: 32,
                            height: 32,
                          bgcolor: (chatInput.trim() || chatAttachment) ? '#6366f1' : 'transparent',
                          '&:hover': { bgcolor: (chatInput.trim() || chatAttachment) ? '#4f46e5' : 'rgba(255,255,255,0.05)' },
                          ml: 1
                        }}
                      >
                         {isSending ? <CircularProgress size={16} sx={{ color: theme.palette.text.primary }} /> : <SendIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* --- FILES VIEW --- */}
              {((isMobile && mobileTab === 'files') || (!isMobile && rightPanelTab === 'files')) && (
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    // Collect files for THIS task only
                    let taskFiles: any[] = [];
                    if (reviewTask) {
                      const fileCols = columns.filter(c => c.type === 'Files');
                      fileCols.forEach(col => {
                        const cellFiles = Array.isArray(reviewTask.values[col.id]) ? reviewTask.values[col.id] : [];
                        cellFiles.forEach((f: any) => {
                          taskFiles.push({ file: f, colId: col.id, colName: col.name });
                        });
                      });

                      // Add files from Chat Messages
                      if (reviewTask.values.message && Array.isArray(reviewTask.values.message)) {
                          reviewTask.values.message.forEach((msg: any) => {
                              if (msg.attachment) {
                                  taskFiles.push({
                                      file: { ...msg.attachment, uploadedAt: msg.timestamp },
                                      colId: 'chat',
                                      colName: 'Chat Attachment'
                                  });
                              }
                          });
                      }

                      // Deduplicate by file URL to avoid showing same file from both Column and Chat
                      const uniqueTaskFiles = Array.from(new Map(taskFiles.map(item => [item.file.url, item])).values());
                      taskFiles = uniqueTaskFiles;
                    }

                    if (taskFiles.length === 0) {
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7, py: 8 }}>
                          <Box sx={{ p: 2, borderRadius: '50%', bgcolor: theme.palette.action.hover, mb: 2 }}>
                            <AttachFileIcon sx={{ fontSize: 32, color: theme.palette.text.secondary }} />
                          </Box>
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>No files attached</Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Upload files in the task columns</Typography>
                        </Box>
                      );
                    }

                    return (
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
                        {taskFiles.map((item, idx) => {
                          const isImage = (item.file.type && item.file.type.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.name);
                          const fileUrl = item.file.url ? (item.file.url.startsWith('http') ? item.file.url : `${SERVER_URL}${item.file.url}`) : null;
                          return (
                            <Paper key={idx} sx={{ bgcolor: theme.palette.action.hover, borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', transform: 'translateY(-2px)' } }}>
                              <Box
                                onClick={() => handleFileClick(item.file, reviewTask!.id, item.colId)}
                                sx={{ height: 100, bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                {isImage && fileUrl ? (
                                  <img src={fileUrl} alt={item.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <InsertDriveFileIcon sx={{ fontSize: 32, color: '#818CF8' }} />
                                )}
                              </Box>
                              <Box sx={{ p: 1.5 }}>
                                <Typography noWrap variant="caption" sx={{ display: 'block', color: theme.palette.text.primary, fontWeight: 600, mb: 0.5 }}>{item.file.name}</Typography>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', fontSize: 10 }}>{item.colName}</Typography>
                              </Box>
                            </Paper>
                          )
                        })}
                      </Box>
                    )
                  })()}
                </Box>
              )}

              {/* --- ACTIVITY VIEW --- */}
              {((isMobile && mobileTab === 'activity') || (!isMobile && rightPanelTab === 'activity')) && (
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                  <Box sx={{ position: 'relative', pl: 2 }}>
                    {/* Line */}
                    <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 7, width: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />

                    {/* Real Activity Data */}
                    {(!reviewTask?.activity || reviewTask.activity.length === 0) ? (
                      <Box sx={{ pl: 2, py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>No activity recorded yet</Typography>
                      </Box>
                    ) : (
                      (reviewTask.activity || []).map((log, idx) => (
                        <Box key={idx} sx={{ mb: 3, position: 'relative', pl: 2 }}>
                          <Box sx={{
                            position: 'absolute',
                            left: -9,
                            top: 4,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: '#818CF8',
                            border: '2px solid #1C1D26'
                          }} />
                          <Typography variant="body2" sx={{ color: '#E5E7EB', mb: 0.5, fontSize: 13 }}>{log.text}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75, ml: 0.5 }}>
                            <Avatar
                              src={log.userAvatar ? (log.userAvatar.startsWith('http') ? log.userAvatar : `${SERVER_URL}${log.userAvatar}`) : undefined}
                              sx={{ width: 24, height: 24, fontSize: 12, bgcolor: theme.palette.primary.main, fontWeight: 600 }}
                            >
                              {!log.userAvatar && (log.user?.[0] || 'U')}
                            </Avatar>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: 13 }}>{log.user || 'User'}</Typography>
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>{log.time}</Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              )}

            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* File Preview / Actions Dialog */}
      <Dialog
        open={fileDialog.open}
        onClose={() => setFileDialog({ ...fileDialog, open: false })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: 3, p: 0, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden', height: '80vh', display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
          <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
            {fileDialog.file?.name || 'File Preview'}
          </Typography>
          <IconButton onClick={() => setFileDialog({ ...fileDialog, open: false })} sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary } }}>
            <span style={{ fontSize: 20 }}>✕</span>
          </IconButton>
        </Box>

        {/* File Preview Container */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' } }}>

          {/* Main Preview */}
          <Box sx={{ flex: 1, bgcolor: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRight: { md: `1px solid ${theme.palette.divider}` }, borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' }, position: 'relative' }}>
            {fileDialog.file && (
              <>
                {fileDialog.file.url ? (
                  <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
                    {(fileDialog.file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileDialog.file.name)) ? (
                      <img
                        src={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                        alt={fileDialog.file.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (fileDialog.file.type === 'application/pdf' || /\.pdf$/i.test(fileDialog.file.name)) ? (
                      <iframe
                        src={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="PDF Preview"
                      />
                    ) : (fileDialog.file.type?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(fileDialog.file.name)) ? (
                        <video 
                            controls 
                            src={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                    ) : (fileDialog.file.type?.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(fileDialog.file.name)) ? (
                        <audio 
                            controls 
                            src={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                        />
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, p: 5 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 80, color: '#0073ea', opacity: 0.8 }} />
                        <Typography sx={{ color: theme.palette.text.secondary, textAlign: 'center', mb: 2 }}>Preview not available for this file type</Typography>
                        <Button
                            variant="outlined"
                            component="a"
                            href={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: theme.palette.text.primary, borderColor: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            Open in New Tab
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ color: '#fdab3d' }}>
                      File not uploaded to server
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Right Sidebar: Details & Comments */}
          <Box sx={{ width: { xs: '100%', md: 320 }, bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', borderLeft: { md: `1px solid ${theme.palette.divider}` }, borderTop: { xs: `1px solid ${theme.palette.divider}`, md: 'none' }, maxHeight: { xs: '50vh', md: '100%' }, overflow: 'hidden' }}>

            {/* Header: File Details */}
            <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="overline" sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1 }}>
                  Details
                </Typography>
                <Chip
                  label={fileDialog.file?.size ? `${(fileDialog.file.size / 1024).toFixed(1)} KB` : 'Unknown Size'}
                  size="small"
                  sx={{ bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontSize: 11, height: 20 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary, mb: 0.5 }}>Uploaded</Typography>
                  <Typography variant="body2" sx={{ color: '#E5E7EB', fontSize: 13 }}>
                    {fileDialog.file?.uploadedAt ? new Date(fileDialog.file.uploadedAt).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary, mb: 0.5 }}>Type</Typography>
                  <Typography variant="body2" sx={{ color: '#E5E7EB', fontSize: 13, textTransform: 'uppercase' }}>
                    {fileDialog.file?.name?.split('.').pop() || 'FILE'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Comments Section */}
            <Typography variant="overline" sx={{ px: 2.5, pt: 2, color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1 }}>
              Comments
            </Typography>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

              {(!fileDialog.file?.comments || fileDialog.file.comments.length === 0) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, opacity: 0.6 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 32, mb: 1, color: theme.palette.text.secondary }} />
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>No comments yet</Typography>
                </Box>
              )}

              {fileDialog.file?.comments?.map((comment: any) => (
                <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                  <Avatar
                    src={comment.userAvatar ? (comment.userAvatar.startsWith('http') ? comment.userAvatar : `${SERVER_URL}${comment.userAvatar}`) : undefined}
                    sx={{ width: 32, height: 32, fontSize: 13, bgcolor: theme.palette.primary.main, fontWeight: 600 }}
                  >
                    {!comment.userAvatar && (comment.user ? comment.user.charAt(0).toUpperCase() : 'U')}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{comment.user}</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>
                        {dayjs(comment.createdAt).fromNow()}
                      </Typography>
                    </Box>
                    <Box sx={{ bgcolor: theme.palette.action.hover, p: 1.5, borderRadius: '0 12px 12px 12px', color: '#E5E7EB' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5 }}>{comment.text}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Comment Input */}
            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a comment..."
                value={fileComment}
                onChange={(e) => setFileComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (fileComment.trim()) handleFileCommentSubmit();
                  }
                }}
                multiline
                maxRows={3}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleFileCommentSubmit}
                        disabled={!fileComment.trim()}
                        sx={{
                          color: '#818CF8',
                          bgcolor: fileComment.trim() ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                          '&.Mui-disabled': { color: '#4B5563', bgcolor: 'transparent' },
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                          mr: -0.5
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    color: theme.palette.text.primary,
                    fontSize: '0.875rem',
                    bgcolor: theme.palette.action.hover,
                    borderRadius: 3,
                    pr: 1,
                    pl: 2,
                    py: 1,
                    '& fieldset': { border: 'none' }
                  }
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Footer Actions */}
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2, bgcolor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
          {fileDialog.colId !== 'chat' ? (
          <Button
            onClick={handleFileDelete}
            sx={{ color: '#EF4444', fontWeight: 600, px: 2, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
            startIcon={<DeleteIcon fontSize="small" />}
          >
            Delete File
          </Button>
          ) : <div />}

          <Box sx={{ display: 'flex', gap: 2 }}>
            {fileDialog.file?.url && (
              <Button
                variant="contained"
                component="a"
                href={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                download={fileDialog.file.name}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<InsertDriveFileIcon />}
                sx={{
                  bgcolor: '#4F46E5',
                  color: theme.palette.text.primary,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#4338CA', boxShadow: 'none' }
                }}
              >
                Download
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>


      {/* Automations Dialog */}
      <Dialog
        open={showEmailAutomation}
        onClose={() => setShowEmailAutomation(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: 4, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: theme.palette.action.selected, borderRadius: 2, color: '#818CF8' }}><BoltIcon /></Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Automations</Typography>
          </Box>
          
          {!isEditingAutomation && (
            <IconButton onClick={() => {
                // Reset form for new automation
                setAutomationEnabled(true);
                setEmailTriggerCol("");
                setEmailCols([]);
                setEmailRecipients([]);
                setActionType("email");
                setApplyToAll(true);
                setSelectedTaskIds([]);
                setCurrentAutomationId(null);
                setIsEditingAutomation(true);
            }} 
            sx={{ 
                bgcolor: '#818CF8', 
                color: theme.palette.text.primary, 
                '&:hover': { bgcolor: '#6366F1' },
                width: 40, height: 40 
            }}>
                <AddIcon />
            </IconButton>
          )}

          <IconButton onClick={() => setShowEmailAutomation(false)} sx={{ color: theme.palette.text.secondary }}><span style={{ fontSize: 24, lineHeight: 1 }}>×</span></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {!isEditingAutomation ? (
            <Box sx={{ p: 3 }}>
              {/* List of Automations */}
              {automations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, color: theme.palette.text.secondary }}>
                   <BoltIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                   <Typography>No automations configured yet.</Typography>
                   <Button 
                     variant="text" 
                     startIcon={<AddIcon />} 
                     onClick={() => {
                        setAutomationEnabled(true);
                        setEmailTriggerCol("");
                        setEmailCols([]);
                        setEmailRecipients([]);
                        setActionType("email");
                        setApplyToAll(true);
                        setSelectedTaskIds([]);
                        setCurrentAutomationId(null);
                        setIsEditingAutomation(true);
                     }}
                     sx={{ mt: 2, color: '#818CF8' }}
                   >
                     Create your first automation
                   </Button>
                </Box>
              ) : (
                <Stack spacing={2}>
                    {automations.map((auto: any) => (
                        <Paper key={auto.id} sx={{ p: 2, bgcolor: theme.palette.action.hover, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Switch checked={auto.enabled} size="small" onChange={async (e) => {
                                const newEnabled = e.target.checked;
                                // Update locally first for responsiveness
                                setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, enabled: newEnabled } : a));
                                // API call
                                await authenticatedFetch(getApiUrl(`/automation/${tableId}`), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        id: auto.id, 
                                        enabled: newEnabled,
                                        triggerCol: auto.triggerCol,
                                        cols: auto.cols,
                                        recipients: auto.recipients,
                                        actionType: auto.actionType,
                                        taskIds: auto.taskIds 
                                    })
                                });
                            }} />
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                    When {columns.find(c => c.id === auto.triggerCol)?.name || 'Unknown Column'} changes
                                </Typography>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                    {auto.actionType === 'notification' ? 'Send Notification' : auto.actionType === 'both' ? 'Send Email & Notification' : 'Send Email'} 
                                    {auto.taskIds && auto.taskIds.length > 0 ? ` (${auto.taskIds.length} tasks)` : ' (All Tasks)'}
                                </Typography>
                            </Box>
                            <IconButton onClick={() => {
                                setAutomationEnabled(auto.enabled);
                                setEmailTriggerCol(auto.triggerCol);
                                setEmailCols(auto.cols || []);
                                setEmailRecipients(auto.recipients || []);
                                setActionType(auto.actionType || 'email');
                                setApplyToAll(!auto.taskIds || auto.taskIds.length === 0);
                                setSelectedTaskIds(auto.taskIds || []);
                                setCurrentAutomationId(auto.id);
                                setIsEditingAutomation(true);
                            }} size="small" sx={{ color: theme.palette.text.secondary }}><EditIcon fontSize="small" /></IconButton>
                            <IconButton onClick={async () => {
                                if (confirm('Delete automation?')) {
                                    await authenticatedFetch(getApiUrl(`/automation/${tableId}/${auto.id}`), { method: 'DELETE' });
                                    // Refresh list
                                    const res = await authenticatedFetch(getApiUrl(`/automation/${tableId}`));
                                    if (res.ok) setAutomations(await res.json());
                                }
                            }} size="small" sx={{ color: '#EF4444' }}><DeleteIcon fontSize="small" /></IconButton>
                        </Paper>
                    ))}
                </Stack>
              )}
            </Box>
          ) : (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
                {/* 
                   Removed the "Enable Automation" switch from here as per user request.
                   It is now controlled via the list view.
                   We default automationEnabled to true when creating, but preserve it when editing (though we won't show the switch).
                */}

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="auto-trigger-col" sx={{ color: theme.palette.text.secondary }}>Trigger Column</InputLabel>
                  <Select
                    labelId="auto-trigger-col"
                    value={emailTriggerCol || ''}
                    label="Trigger Column"
                    onChange={e => setEmailTriggerCol(e.target.value)}
                    sx={{ color: theme.palette.text.primary, bgcolor: theme.palette.action.hover }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                  >
                    {columns.map(col => (
                      <MenuItem key={col.id} value={col.id}>{col.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="auto-action-type" sx={{ color: theme.palette.text.secondary }}>Action</InputLabel>
                    <Select
                        labelId="auto-action-type"
                        value={actionType}
                        label="Action"
                        onChange={e => setActionType(e.target.value as any)}
                        sx={{ color: theme.palette.text.primary, bgcolor: theme.palette.action.hover }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        <MenuItem value="notification">Notification Only</MenuItem>
                        <MenuItem value="email">Email Only</MenuItem>
                        <MenuItem value="both">Email & Notification</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ color: theme.palette.text.secondary, fontSize: 13 }}>Apply to</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Button 
                            variant={applyToAll ? "contained" : "outlined"} 
                            onClick={() => { setApplyToAll(true); setSelectedTaskIds([]); }}
                            fullWidth
                            sx={{ 
                                bgcolor: applyToAll ? '#818CF8' : 'transparent', 
                                borderColor: applyToAll ? '#818CF8' : 'rgba(255,255,255,0.1)',
                                color: applyToAll ? '#fff' : '#9CA3AF',
                                '&:hover': { bgcolor: applyToAll ? '#6366F1' : 'rgba(255,255,255,0.05)' }
                            }}
                        >
                            All Tasks
                        </Button>
                        <Button 
                            variant={!applyToAll ? "contained" : "outlined"} 
                            onClick={() => setApplyToAll(false)}
                            fullWidth
                            sx={{ 
                                bgcolor: !applyToAll ? '#818CF8' : 'transparent', 
                                borderColor: !applyToAll ? '#818CF8' : 'rgba(255,255,255,0.1)',
                                color: !applyToAll ? '#fff' : '#9CA3AF',
                                '&:hover': { bgcolor: !applyToAll ? '#6366F1' : 'rgba(255,255,255,0.05)' }
                            }}
                        >
                            Select Tasks
                        </Button>
                    </Box>
                    
                    {!applyToAll && (
                        <FormControl fullWidth sx={{ mb: 1 }}>
                            <InputLabel id="select-tasks-label" sx={{ color: theme.palette.text.secondary }}>Tasks</InputLabel>
                            <Select
                                labelId="select-tasks-label"
                                multiple
                                value={selectedTaskIds}
                                onChange={(e) => setSelectedTaskIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                                renderValue={(selected) => `${selected.length} tasks selected`}
                                sx={{ color: theme.palette.text.primary, bgcolor: theme.palette.action.hover }}
                                MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, maxHeight: 300 } } }}
                            >
                                {rows.map((row) => {
                                    // Try to find a meaningful name for the task
                                    const textCol = columns.find(c => c.type === 'Text');
                                    let taskName = (textCol && row.values[textCol.id]) ? String(row.values[textCol.id]) : `Task ${row.id.substring(0, 8)}...`;
                                    // Prepend the index/row number to the name for selection if it's the raw list being mapped
                                    // But wait, the map currently is:
                                    const rowIndex = rows.findIndex(r => r.id === row.id) + 1;
                                    taskName = `Row ${rowIndex}: ${taskName}`;

                                    return (
                                        <MenuItem key={row.id} value={row.id}>
                                            <Checkbox checked={selectedTaskIds.indexOf(row.id) > -1} sx={{ color: '#818CF8' }} />
                                            <ListItemText primary={taskName} secondary={row.id} secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.5)', fontSize: 10 } }} />
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    )}
                </Box>

                {/* Options always visible regardless of action type */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="email-cols-label" sx={{ color: theme.palette.text.secondary }}>Include Columns</InputLabel>
                    <Select
                        labelId="email-cols-label"
                        multiple
                        value={emailCols}
                        onChange={(e) => setEmailCols(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        renderValue={(selected) => columns.filter((col) => selected.includes(col.id)).map((col) => col.name).join(', ')}
                        sx={{ color: theme.palette.text.primary, bgcolor: theme.palette.action.hover }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        {columns.map((col) => (
                        <MenuItem key={col.id} value={col.id}>
                            <Checkbox checked={emailCols.indexOf(col.id) > -1} sx={{ color: '#818CF8' }} />
                            <ListItemText primary={col.name} />
                        </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="email-recipients-label" sx={{ color: theme.palette.text.secondary }}>Recipients</InputLabel>
                    <Select
                        labelId="email-recipients-label"
                        multiple
                        value={emailRecipients}
                        onChange={(e) => setEmailRecipients(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        renderValue={(selected) => selected.map((email: string) => {
                            const person = peopleOptions.find((p: { name: string; email: string }) => p.email === email);
                            return person ? person.name : email;
                        }).join(', ')}
                        sx={{ color: theme.palette.text.primary, bgcolor: theme.palette.action.hover }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        {peopleOptions.map((person: { name: string; email: string }) => (
                        <MenuItem key={person.email} value={person.email}>
                            <Checkbox checked={emailRecipients.indexOf(person.email) > -1} sx={{ color: '#818CF8' }} />
                            <ListItemText primary={person.name} />
                        </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                  <Button variant="text" onClick={() => setIsEditingAutomation(false)} sx={{ color: theme.palette.text.secondary }}>Cancel</Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="contained"
                    onClick={async () => {
                      const body = {
                        id: currentAutomationId,
                        enabled: automationEnabled,
                        triggerCol: emailTriggerCol,
                        cols: emailCols,
                        recipients: emailRecipients,
                        actionType: actionType,
                        taskIds: applyToAll ? [] : selectedTaskIds
                      };
                      
                      await authenticatedFetch(getApiUrl(`/automation/${tableId}`), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                      });
                      
                      // Refresh list
                      const res = await authenticatedFetch(getApiUrl(`/automation/${tableId}`));
                      if (res.ok) setAutomations(await res.json());
                      
                      setIsEditingAutomation(false);
                    }}
                    sx={{ bgcolor: '#818CF8', '&:hover': { bgcolor: '#6366F1' } }}
                  >
                    Save Changes
                  </Button>
                </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box >
  );
}