"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  Alert,
  useTheme,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Tab,
  Tabs,
  Paper,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Tooltip,
  Stack,
  Autocomplete,
  MenuItem,
  Chip
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SecurityIcon from "@mui/icons-material/Security";
import PaletteIcon from "@mui/icons-material/Palette";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import WorkIcon from "@mui/icons-material/Work";
import BusinessIcon from "@mui/icons-material/Business";
import CallIcon from "@mui/icons-material/Call";
import GroupIcon from "@mui/icons-material/Group";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import HistoryIcon from "@mui/icons-material/History";
import LinkIcon from "@mui/icons-material/Link";
import KeyIcon from "@mui/icons-material/Key";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import { getApiUrl, authenticatedFetch, getAvatarUrl, navigateToAppRoute } from "../../apiUrl";
import { useThemeContext } from "../../ThemeContext";
import { useNotification } from "../../NotificationContext";
import { useSearchParams, useRouter } from "next/navigation";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const BOARD_CAPABILITY_LABELS: Record<string, string> = {
  editRows: "Edit rows",
  comment: "Comment",
  uploadFiles: "Upload files",
  export: "Export data",
  manageColumns: "Manage columns",
};

const BOARD_ROLE_CAPABILITIES: Record<string, Record<string, boolean>> = {
  admin: { editRows: true, comment: true, uploadFiles: true, export: true, manageColumns: true },
  manager: { editRows: true, comment: true, uploadFiles: true, export: true, manageColumns: true },
  employee: { editRows: true, comment: true, uploadFiles: true, export: false, manageColumns: false },
  guest: { editRows: false, comment: false, uploadFiles: false, export: false, manageColumns: false },
  client: { editRows: false, comment: true, uploadFiles: true, export: false, manageColumns: false },
  custom: { editRows: false, comment: false, uploadFiles: false, export: false, manageColumns: false },
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mode, toggleTheme } = useThemeContext();
  
  const tabMap: Record<string, number> = {
    profile: 0,
    appearance: 1,
    notifications: 2,
    security: 3,
    team: 4,
    billing: 5,
    audit: 6,
    sharing: 7,
    api: 8
  };

  const initialTab = searchParams.get("tab");
  const [tabValue, setTabValue] = useState(tabMap[initialTab || ""] || 0);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabMap[tab] !== undefined) {
      setTabValue(tabMap[tab]);
    }
  }, [searchParams]);

  // Profile State
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Notifications State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [advancedNotifications,setAdvancedNotifications]=useState<any>({categories:{assignments:true,comments:true,deadlines:true,security:true,billing:true},digest:"instant",quietHours:{enabled:false,start:"22:00",end:"07:00",timezone:"Europe/Warsaw"}});

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");

  // Billing State
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [shareTableId, setShareTableId] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [sharingBusy, setSharingBusy] = useState(false);
  const [portalTitle,setPortalTitle]=useState("Client Portal");
  const [portalWelcome,setPortalWelcome]=useState("Welcome. Review the latest board information below.");
  const [portalComments,setPortalComments]=useState(true);
  const [portalPassword,setPortalPassword]=useState("");
  const [portalRemovePassword,setPortalRemovePassword]=useState(false);
  const [portalExpiresAt,setPortalExpiresAt]=useState("");
  const [portalDownloads,setPortalDownloads]=useState(false);
  const [portalApprovals,setPortalApprovals]=useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeyName, setApiKeyName] = useState("Production integration");
  const [newApiKey, setNewApiKey] = useState("");
  const [webhooks,setWebhooks]=useState<any[]>([]); const [webhookName,setWebhookName]=useState("Board updates"); const [webhookUrl,setWebhookUrl]=useState(""); const [webhookSecret,setWebhookSecret]=useState("");

  // Teammates State
  const [teammates, setTeammates] = useState<any[]>([]);
  const [loadingTeammates, setLoadingTeammates] = useState(false);
  const [lastWorkspaceId, setLastWorkspaceId] = useState<string | null>(null);
  
  // Invite Dialog State
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWorkspaces, setInviteWorkspaces] = useState<any[]>([]);
  const [selectedInviteWs, setSelectedInviteWs] = useState<string>("");
  const [inviteTables, setInviteTables] = useState<any[]>([]);
  const [selectedInviteTable, setSelectedInviteTable] = useState<string>("");
  const [invitePermission, setInvitePermission] = useState<'admin' | 'manager' | 'employee' | 'guest'>('employee');
  const [currentTableInviteCode, setCurrentTableInviteCode] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [peopleSuggestions, setPeopleSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedTeammateForAccess, setSelectedTeammateForAccess] = useState<any | null>(null);
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const { showNotification } = useNotification();

  useEffect(()=>{if(tabValue===2)authenticatedFetch(getApiUrl("notification-preferences")).then(r=>r.ok?r.json():null).then(p=>p&&setAdvancedNotifications(p));},[tabValue]);
  useEffect(()=>{if(tabValue===3)authenticatedFetch(getApiUrl("users/two-factor")).then(r=>r.ok?r.json():null).then(data=>data&&setTwoFactorEnabled(Boolean(data.enabled)));},[tabValue]);
  const updateTwoFactor=async(enabled:boolean)=>{
    setTwoFactorBusy(true);setTwoFactorError("");setTwoFactorMessage("");
    try{
      const response=await authenticatedFetch(getApiUrl("users/two-factor"),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled,password:twoFactorPassword})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to update two-factor authentication");
      setTwoFactorEnabled(Boolean(data.enabled));setTwoFactorPassword("");
      setTwoFactorMessage(data.enabled?"Two-factor authentication is now ON. A code will be sent to your email after password login.":"Two-factor authentication is now OFF. Future logins will use password only.");
    }catch(error:any){setTwoFactorError(error.message||"Unable to update two-factor authentication");}
    finally{setTwoFactorBusy(false);}
  };
  const saveAdvancedNotifications=async(next:any)=>{setAdvancedNotifications(next);setSavingNotificationSettings(true);try{const r=await authenticatedFetch(getApiUrl("notification-preferences"),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)});if(!r.ok)throw new Error();showNotification("Notification preferences saved","success");}catch{showNotification("Unable to save notification preferences","error");}finally{setSavingNotificationSettings(false);}};

  useEffect(() => {
    if (tabValue !== 6) return;
    const loadAuditLogs = async () => {
      setLoadingAuditLogs(true);
      try {
        const response = await authenticatedFetch(getApiUrl("audit"));
        if (response.ok) setAuditLogs(await response.json());
      } finally {
        setLoadingAuditLogs(false);
      }
    };
    void loadAuditLogs();
  }, [tabValue]);

  useEffect(() => {
    if (tabValue === 7 && user?.id) void fetchWorkspaces();
  }, [tabValue, user?.id]);

  const loadApiKeys = async () => { const r=await authenticatedFetch(getApiUrl("api-keys")); if(r.ok)setApiKeys(await r.json()); };
  const loadWebhooks=async()=>{const r=await authenticatedFetch(getApiUrl("webhooks"));if(r.ok)setWebhooks(await r.json());};
  useEffect(()=>{if(tabValue===8){void loadApiKeys();void loadWebhooks();}},[tabValue]);
  const createApiKey = async()=>{const r=await authenticatedFetch(getApiUrl("api-keys"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:apiKeyName})});const d=await r.json();if(r.ok){setNewApiKey(d.key);void loadApiKeys();showNotification("API key created. Copy it now.","success");}else showNotification(d.error,"error");};
  const revokeApiKey = async(id:string)=>{await authenticatedFetch(getApiUrl(`api-keys?id=${id}`),{method:"DELETE"});void loadApiKeys();};
  const createWebhook=async()=>{const r=await authenticatedFetch(getApiUrl("webhooks"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:webhookName,url:webhookUrl,events:["board.updated","task.created","task.updated"]})});const d=await r.json();if(r.ok){setWebhookSecret(d.signingSecret);setWebhookUrl("");void loadWebhooks();showNotification("Webhook created","success");}else showNotification(d.error,"error");};
  const deleteWebhook=async(id:string)=>{await authenticatedFetch(getApiUrl(`webhooks?id=${id}`),{method:"DELETE"});void loadWebhooks();};
  const testWebhook=async(id:string)=>{const r=await authenticatedFetch(getApiUrl("webhooks/deliver-test"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const d=await r.json();showNotification(d.success?`Webhook delivered (${d.status})`:`Delivery failed (${d.status})`,d.success?"success":"error");void loadWebhooks();};

  const handlePublicShare = async (enable: boolean) => {
    if (!shareTableId) return;
    setSharingBusy(true);
    try {
      const response = await authenticatedFetch(getApiUrl(`tables/${shareTableId}/public-share`), { method: enable ? "POST" : "DELETE", headers:enable?{"Content-Type":"application/json"}:undefined, body:enable?JSON.stringify({title:portalTitle,welcome:portalWelcome,allowComments:portalComments,password:portalPassword,removePassword:portalRemovePassword,expiresAt:portalExpiresAt||null,allowDownloads:portalDownloads,allowApprovals:portalApprovals}):undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update public link");
      setShareToken(data.token || "");
      setPortalPassword(""); setPortalRemovePassword(false);
      showNotification(enable ? "Public view-only link enabled" : "Public link disabled", "success");
    } catch (error:any) {
      showNotification(error.message, "error");
    } finally { setSharingBusy(false); }
  };

  useEffect(() => {
    if (user?.id) {
        const stored = localStorage.getItem(`lastWorkspace_${user.id}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.id) setLastWorkspaceId(parsed.id);
            } catch (e) {}
        }
    }
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
        try {
            const res = await authenticatedFetch(getApiUrl('users/profile'));
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setEditName(data.name || "");
                setEditFirstName(data.first_name || "");
                setEditLastName(data.last_name || "");
                setEditBirthDate(data.birth_date ? String(data.birth_date).slice(0, 10) : "");
                setEditGender(data.gender || "");
                setEditEmail(data.email || "");
                setEditAvatar(data.avatar || "");
                setEditJobTitle(data.job_title || "");
                setEditCompany(data.company || "");
                setEditPhone(data.phone || "");
                setEmailNotifications(data.email_notifications !== false);
                setPushNotifications(data.push_notifications !== false);
                
                // Keep local storage in sync
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    localStorage.setItem("user", JSON.stringify({ ...parsed, ...data }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch profile", e);
        }
    };
    
    fetchProfile();
  }, []);

  useEffect(() => {
    if (tabValue === 4) {
      const fetchTeammates = async () => {
        setLoadingTeammates(true);
        try {
          const res = await authenticatedFetch(getApiUrl('teammates'));
          if (res.ok) {
            const data = await res.json();
            setTeammates(data);
          }
        } catch (e) {
          console.error("Failed to fetch teammates", e);
        } finally {
          setLoadingTeammates(false);
        }
      };
      fetchTeammates();
    }
  }, [tabValue]);

  useEffect(() => {
    if (tabValue !== 5) return;
    setLoadingBilling(true);
    authenticatedFetch(getApiUrl("billing/status"))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load billing");
        setBillingStatus(data);
      })
      .catch((error) => showNotification(error.message, "error"))
      .finally(() => setLoadingBilling(false));
  }, [tabValue, showNotification]);

  const handleChangePlan = async (plan: string) => {
    if (plan === "enterprise") {
      window.location.href = "mailto:a.gjendzz@gmail.com?subject=Smart%20Manage%20Enterprise%20Plan";
      return;
    }
    setCheckoutPlan(plan);
    try {
      const response = await authenticatedFetch(getApiUrl("billing/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing: billingCycle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start checkout");
      window.location.href = data.url;
    } catch (error: any) {
      showNotification(error.message || "Unable to start checkout", "error");
      setCheckoutPlan("");
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await authenticatedFetch(getApiUrl('workspaces'));
      if (res.ok) {
        const data = await res.json();
        const ownedWorkspaces = data.filter((ws: any) => String(ws.owner_id) === String(user?.id));
        setInviteWorkspaces(ownedWorkspaces);
        if (ownedWorkspaces.length > 0) {
            setSelectedInviteWs(ownedWorkspaces[0].id);
            fetchTablesForInvite(ownedWorkspaces[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch workspaces", e);
    }
  };

  const fetchTablesForInvite = async (wsId: string) => {
    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${wsId}/tables`));
      if (res.ok) {
        const data = await res.json();
        setInviteTables(data);
        if (data.length > 0) setSelectedInviteTable(data[0].id);
        else setSelectedInviteTable("");
      }
    } catch (e) {
      console.error("Failed to fetch tables", e);
    }
  };

  useEffect(() => {
    if (selectedInviteTable) {
        const fetchInviteCode = async () => {
            try {
                // Use POST to get OR generate the code
                const res = await authenticatedFetch(getApiUrl(`tables/${selectedInviteTable}/invite-code`), {
                    method: 'POST'
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentTableInviteCode(data.invite_code || null);
                }
            } catch (e) {
                console.error("Failed to fetch/generate invite code", e);
            }
        };
        fetchInviteCode();
    } else {
        setCurrentTableInviteCode(null);
    }
  }, [selectedInviteTable]);

  const fetchPeopleSuggestions = async (query: string) => {
    if (!query.trim()) {
      setPeopleSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await authenticatedFetch(getApiUrl(`people?q=${encodeURIComponent(query)}`));
      if (res.ok) {
        const data = await res.json();
        setPeopleSuggestions(data);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleRemoveTeammate = async (teammateId: string) => {
    if (!confirm("Are you sure you want to remove this teammate? They will lose access to all boards you own.")) return;
    
    try {
        const res = await authenticatedFetch(getApiUrl(`teammates/${teammateId}`), {
            method: 'DELETE'
        });
        
        if (res.ok) {
            showNotification("Teammate removed successfully", "success");
            // Refresh list
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            showNotification("Failed to remove teammate", "error");
        }
    } catch (e) {
        console.error("Remove error", e);
        showNotification("Error removing teammate", "error");
    }
  };

  const handleUpdateGranularPermission = async (teammateId: string, tableId: string, newRole: string, capabilities?: Record<string, boolean>) => {
    try {
        const res = await authenticatedFetch(getApiUrl(`tables/${tableId}/teammates/${teammateId}/permission`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole, capabilities })
        });
        
        if (res.ok) {
            showNotification(`Updated role to ${newRole}`, "success");
            // Refresh local state to reflect change in the dialog
            if (selectedTeammateForAccess) {
              const updatedAccess = selectedTeammateForAccess.access.map((a: any) => 
                a.tableId === tableId ? { ...a, role: newRole, ...(capabilities ? { capabilities } : {}) } : a
              );
              setSelectedTeammateForAccess({ ...selectedTeammateForAccess, access: updatedAccess });
            }
            // Refresh main list
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            showNotification("Failed to update permission", "error");
        }
    } catch (e) {
        console.error("Update granular permission error", e);
        showNotification("Error updating access", "error");
    }
  };

  const handleInviteTeammate = async () => {
    if (!selectedUser || !selectedInviteTable) {
        showNotification("Please select a teammate and a board", "error");
        return;
    }
    
    setIsInviting(true);
    try {
        const res = await authenticatedFetch(getApiUrl(`tables/${selectedInviteTable}/invite`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientId: selectedUser.id,
              userId: selectedUser.id,
              role: invitePermission,
            })
        });

        const payload = await res.json().catch(() => null);
        
        if (res.ok) {
            showNotification(`Successfully invited ${selectedUser.name} to the board!`, "success");
            setInviteDialogOpen(false);
            setInviteEmail("");
            setSelectedUser(null);
            // Refresh teammates
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            showNotification(payload?.error || "Failed to invite teammate", "error");
        }
    } catch (e) {
        console.error("Invite error", e);
        showNotification("Error inviting teammate", "error");
    } finally {
        setIsInviting(false);
    }
  };

  const handleCreateNewUser = () => {
    // If no user exists, create a default one
    const newUser = {
      name: "New User",
      email: "user@example.com",
      avatar: ""
    };
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
    setEditName(newUser.name);
    setEditEmail(newUser.email);
    setEditAvatar(newUser.avatar);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const fullName = `${editFirstName.trim()} ${editLastName.trim()}`.trim() || editName.trim();
    if (!fullName) {
      setProfileError("Name is required");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authenticatedFetch(getApiUrl('users/profile'), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: fullName,
          first_name: editFirstName,
          last_name: editLastName,
          birth_date: editBirthDate || null,
          gender: editGender || null,
          avatar: editAvatar,
          job_title: editJobTitle,
          company: editCompany,
          phone: editPhone
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile on server");
      
      const updatedUser = await res.json();
      
      // Update local state and localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setProfileSaved(true);
      setProfileError("");
      // Notify other components to refresh user data (e.g., TableBoard)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile-updated'));
      }
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e: any) {
      console.error(e);
      setProfileError(e.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleNotificationToggle = async (
    setting: "email_notifications" | "push_notifications",
    checked: boolean
  ) => {
    const previousEmail = emailNotifications;
    const previousPush = pushNotifications;

    if (setting === "email_notifications") {
      setEmailNotifications(checked);
    } else {
      setPushNotifications(checked);
    }

    setSavingNotificationSettings(true);

    try {
      const nextEmail = setting === "email_notifications" ? checked : previousEmail;
      const nextPush = setting === "push_notifications" ? checked : previousPush;

      const res = await authenticatedFetch(getApiUrl("users/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_notifications: nextEmail,
          push_notifications: nextPush,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update notification settings");
      }

      const updatedUser = await res.json();
      setUser((prev: any) => ({ ...(prev || {}), ...updatedUser }));
      setEmailNotifications(updatedUser.email_notifications !== false);
      setPushNotifications(updatedUser.push_notifications !== false);

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        localStorage.setItem("user", JSON.stringify({ ...parsed, ...updatedUser }));
      } else {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile-updated'));
      }

      showNotification(
        `${setting === "email_notifications" ? "Email" : "Push"} notifications ${checked ? "enabled" : "disabled"}`,
        "success"
      );
    } catch (e) {
      console.error("Failed to update notification settings", e);
      setEmailNotifications(previousEmail);
      setPushNotifications(previousPush);
      showNotification("Failed to update notification settings", "error");
    } finally {
      setSavingNotificationSettings(false);
    }
  };

   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const tabName = Object.keys(tabMap).find(key => tabMap[key] === newValue);
    if (tabName) {
      navigateToAppRoute(`/settings?tab=${tabName}`, router, false, { scroll: false });
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setProfileError("Please choose an image file");
        event.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setProfileError("Profile photo must be 5 MB or smaller");
        event.target.value = "";
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      setUploadingAvatar(true);
      setProfileError("");
      try {
        const res = await authenticatedFetch(getApiUrl('upload'), {
          method: 'POST',
          body: formData,
        });
        
        if (res.ok) {
          const data = await res.json();
          // data.url is a relative path like /uploads/filename.jpg
          setEditAvatar(data.url);
          // Optionally notify immediately after avatar upload (before save)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('profile-updated'));
          }
        } else {
          setProfileError("Failed to upload image");
        }
      } catch (err) {
        console.error("Upload failed", err);
        setProfileError("Error uploading image");
      } finally {
        setUploadingAvatar(false);
        event.target.value = "";
      }
    }
  };

  const handleCancelProfileEdit = () => {
    setEditName(user?.name || "");
    setEditFirstName(user?.first_name || "");
    setEditLastName(user?.last_name || "");
    setEditBirthDate(user?.birth_date ? String(user.birth_date).slice(0, 10) : "");
    setEditGender(user?.gender || "");
    setEditEmail(user?.email || "");
    setEditAvatar(user?.avatar || "");
    setEditJobTitle(user?.job_title || "");
    setEditCompany(user?.company || "");
    setEditPhone(user?.phone || "");
    setProfileError("");
    setIsEditing(false);
  };

   const handleChangePassword = async (event?: React.FormEvent) => {
      event?.preventDefault();
      setPasswordError("");
      setPasswordSuccess("");
      if (newPassword !== confirmPassword) {
          setPasswordError("Passwords do not match");
          return;
      }
      if (newPassword.length < 8) {
          setPasswordError("Password must be at least 8 characters");
          return;
      }
      setChangingPassword(true);
      try {
        const response = await authenticatedFetch(getApiUrl("change-password"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to update password");
        setPasswordSuccess(data.message || "Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error: any) {
        setPasswordError(error.message || "Unable to update password");
      } finally {
        setChangingPassword(false);
      }
  };

  const surfaceBg = theme.palette.mode === 'dark' ? 'rgba(20, 20, 20, 0.42)' : 'rgba(255, 255, 255, 0.68)';
  const panelBg = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.5)';
  const inputBg = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)';
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: inputBg,
      boxShadow: theme.palette.mode === 'dark'
        ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
        : 'inset 0 1px 0 rgba(255,255,255,0.7)',
      '& fieldset': { border: 'none' },
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': { border: 'none' },
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 1, sm: 2, md: 4 }, overflowX: "hidden" }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 4, letterSpacing: '-0.5px' }}>
        Account Settings
      </Typography>

      <Paper sx={{ 
        mb: 4, 
        overflow: 'hidden', 
        borderRadius: 4, 
        bgcolor: surfaceBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: theme.palette.mode === 'dark' ? '0 24px 64px rgba(0,0,0,0.4)' : '0 24px 64px rgba(0,0,0,0.06)',
        backgroundImage: 'none',
        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
      }}>
        <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { display: "none" } }} // Hide the standard underline
            sx={{ 
              p: { xs: 0.75, sm: 1.5 },
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.18)',
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 999,
                margin: '0 4px',
                padding: { xs: '7px 12px', sm: '8px 20px' },
                color: theme.palette.text.secondary,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  color: theme.palette.text.primary,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                },
                '&.Mui-selected': {
                  color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.dark,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                }
              }
            }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Profile" />
          <Tab icon={<PaletteIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Appearance" />
          <Tab icon={<NotificationsIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Notifications" />
          <Tab icon={<SecurityIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Security" />
          <Tab icon={<GroupIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Team" />
          <Tab icon={<CreditCardIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Billing" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Audit Log" />
          <Tab icon={<LinkIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Public Sharing" />
          <Tab icon={<KeyIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="API & Integrations" />
        </Tabs>

        {/* PROFILE TAB */}
        <TabPanel value={tabValue} index={0}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                mb: 4,
                gap: { xs: 4, sm: 5 },
                p: { xs: 3, sm: 4 },
                borderRadius: 4,
                bgcolor: panelBg,
                boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.55)',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, ml: { sm: 2 } }}>
                <Avatar
                  src={(isEditing ? editAvatar : user?.avatar)
                    ? getAvatarUrl(isEditing ? editAvatar : user?.avatar, isEditing ? editName : user?.name)
                    : undefined}
                  sx={{ 
                    width: 110, height: 110, fontSize: 44, fontWeight: 700, 
                    mx: { xs: 'auto', sm: 0 },
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                    color: theme.palette.primary.main,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    '& .MuiAvatar-img': {
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      bgcolor: theme.palette.background.paper,
                    },
                  }}
                >
                  {(isEditing ? editName : user?.name)?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                {isEditing && (
                  <Stack spacing={0.75} alignItems="center">
                    <Button
                      component="label"
                      size="small"
                      variant="outlined"
                      startIcon={uploadingAvatar ? <CircularProgress size={15} /> : <PhotoCamera />}
                      disabled={uploadingAvatar}
                      sx={{ textTransform: 'none' }}
                    >
                      {editAvatar ? "Replace photo" : "Upload photo"}
                      <input hidden accept="image/*" type="file" onChange={handleAvatarSelect} />
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      disabled={!editAvatar || uploadingAvatar}
                      onClick={() => setEditAvatar("")}
                      sx={{ textTransform: 'none' }}
                    >
                      Remove photo
                    </Button>
                    <Typography variant="caption" color="text.secondary">JPG, PNG or WebP, max 5 MB</Typography>
                  </Stack>
                )}
              </Box>
              
              <Box sx={{ flexGrow: 1, width: '100%' }}>
                {isEditing ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600, mx: { xs: 'auto', sm: 0 } }}>
                    <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <TextField
                        label="First Name"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      />
                      <TextField
                        label="Last Name"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      />
                    </Box>
                    <TextField
                      label="Email"
                      value={editEmail}
                      size="small"
                      sx={{ width: '100%', ...fieldSx }}
                      disabled
                    />
                    <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <TextField
                        label="Job Title"
                        value={editJobTitle}
                        onChange={(e) => setEditJobTitle(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      />
                      <TextField
                        label="Company"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      />
                    </Box>
                    <TextField
                      label="Phone Number"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      size="small"
                      sx={{ width: '100%', ...fieldSx }}
                    />
                    <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <TextField
                        label="Birthday"
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: '100%', ...fieldSx }}
                      />
                      <TextField
                        select
                        label="Gender"
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      >
                        <MenuItem value="">Prefer not to say</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </TextField>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                    <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>{user?.name || "User Name"}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: 15, fontWeight: 500 }}>{user?.email || "user@example.com"}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: 2, mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                      {user?.job_title && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                          <WorkIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>{user.job_title}</Typography>
                        </Box>
                      )}
                      {user?.company && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main }}>
                          <BusinessIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>{user.company}</Typography>
                        </Box>
                      )}
                      {user?.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                          <CallIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>{user.phone}</Typography>
                        </Box>
                      )}
                      {user?.birth_date && (
                        <Box sx={{ px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                          <Typography variant="body2" fontWeight={600}>Birthday: {String(user.birth_date).slice(0, 10)}</Typography>
                        </Box>
                      )}
                      {user?.gender && (
                        <Box sx={{ px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                          <Typography variant="body2" fontWeight={600}>Gender: {user.gender}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: { xs: 2, sm: 0 }, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, minWidth: 120 }}>
                {isEditing ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={handleCancelProfileEdit} disabled={savingProfile} color="inherit" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06) }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveProfile} disabled={savingProfile || uploadingAvatar} color="primary" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}` }}>
                      {savingProfile ? <CircularProgress size={20} color="inherit" /> : "Save"}
                    </Button>
                  </Box>
                ) : (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsEditing(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06), '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) } }}>
                    Edit Profile
                  </Button>
                )}
              </Box>
            </Box>

            {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
            {profileSaved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}

            <Paper sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: panelBg, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box>
                <Typography fontWeight={700}>Workspace onboarding</Typography>
                <Typography variant="body2" color="text.secondary">Restart the setup checklist for templates, modules, imports, team invites and dashboard customization.</Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => {
                  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                  localStorage.removeItem(`smartManageOnboarding_${storedUser.id || storedUser.email || "user"}`);
                  navigateToAppRoute("/home", router);
                }}
                sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
              >
                Restart guide
              </Button>
            </Paper>
        </TabPanel>

        {/* APPEARANCE TAB */}
        <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Theme Preferences</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Choose how the platform looks to you.</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
                <Paper sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: panelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}` }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, width: 44, height: 44 }}>
                            {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Dark Mode</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {mode === 'dark' ? "App is currently in dark mode" : "App is currently in light mode"}
                            </Typography>
                        </Box>
                    </Box>
                    <Switch edge="end" onChange={toggleTheme} checked={mode === 'dark'} color="primary" />
                </Paper>
            </Box>
            <Paper sx={{p:3,borderRadius:3,bgcolor:panelBg,maxWidth:700,mt:3}}><Typography variant="h6" fontWeight={900} sx={{mb:2}}>Advanced delivery controls</Typography><Stack gap={1}>{Object.entries(advancedNotifications.categories||{}).map(([key,value])=><Box key={key} sx={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Typography sx={{textTransform:"capitalize"}}>{key}</Typography><Switch checked={Boolean(value)} disabled={key==="security"} onChange={e=>void saveAdvancedNotifications({...advancedNotifications,categories:{...advancedNotifications.categories,[key]:e.target.checked}})}/></Box>)}<TextField select label="Digest frequency" value={advancedNotifications.digest} onChange={e=>void saveAdvancedNotifications({...advancedNotifications,digest:e.target.value})} sx={fieldSx}><MenuItem value="instant">Instant</MenuItem><MenuItem value="daily">Daily digest</MenuItem><MenuItem value="weekly">Weekly digest</MenuItem></TextField><Box sx={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Box><Typography fontWeight={800}>Quiet hours</Typography><Typography variant="body2" color="text.secondary">Pause non-security alerts during these hours</Typography></Box><Switch checked={advancedNotifications.quietHours?.enabled||false} onChange={e=>void saveAdvancedNotifications({...advancedNotifications,quietHours:{...advancedNotifications.quietHours,enabled:e.target.checked}})}/></Box>{advancedNotifications.quietHours?.enabled&&<Stack direction={{xs:"column",sm:"row"}} gap={1}><TextField type="time" label="Start" value={advancedNotifications.quietHours.start} onChange={e=>setAdvancedNotifications({...advancedNotifications,quietHours:{...advancedNotifications.quietHours,start:e.target.value}})} InputLabelProps={{shrink:true}}/><TextField type="time" label="End" value={advancedNotifications.quietHours.end} onChange={e=>void saveAdvancedNotifications({...advancedNotifications,quietHours:{...advancedNotifications.quietHours,end:e.target.value}})} InputLabelProps={{shrink:true}}/></Stack>}</Stack></Paper>
        </TabPanel>

        {/* NOTIFICATIONS TAB */}
        <TabPanel value={tabValue} index={2}>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Notification Settings</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Manage how you receive updates and alerts.
            </Typography>
            
            {savingNotificationSettings && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Saving notification settings...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
                <Paper sx={{
                  p: 2.5, borderRadius: 3,
                  bgcolor: panelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}` }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main, width: 44, height: 44 }}>
                            <NotificationsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Email Notifications</Typography>
                            <Typography variant="body2" color="text.secondary">Receive updates via email</Typography>
                        </Box>
                    </Box>
                    <Switch
                      edge="end"
                      onChange={(e) => handleNotificationToggle("email_notifications", e.target.checked)}
                      checked={emailNotifications}
                      color="info"
                      disabled={savingNotificationSettings}
                    />
                </Paper>
                
                <Paper sx={{
                  p: 2.5, borderRadius: 3,
                  bgcolor: panelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}` }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, width: 44, height: 44 }}>
                            <NotificationsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Push Notifications</Typography>
                            <Typography variant="body2" color="text.secondary">Receive push notifications on your device</Typography>
                        </Box>
                    </Box>
                    <Switch
                      edge="end"
                      onChange={(e) => handleNotificationToggle("push_notifications", e.target.checked)}
                      checked={pushNotifications}
                      color="warning"
                      disabled={savingNotificationSettings}
                    />
                </Paper>
            </Box>
        </TabPanel>

        {/* SECURITY TAB */}
        <TabPanel value={tabValue} index={3}>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Two-Factor Authentication</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Choose whether login requires a one-time verification code sent to your account email.</Typography>
            <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, maxWidth: 600, bgcolor: panelBg, mb: 4 }}>
              <Stack gap={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography fontWeight={800}>Email verification code</Typography>
                    <Typography variant="body2" color="text.secondary">Status: {twoFactorEnabled ? "ON — protected with password and email code" : "OFF — password login only"}</Typography>
                  </Box>
                  <Switch checked={twoFactorEnabled} disabled={twoFactorBusy || !twoFactorPassword} onChange={event=>void updateTwoFactor(event.target.checked)} inputProps={{ 'aria-label': 'Two-factor authentication' }} />
                </Box>
                <TextField type="password" label="Confirm current password" value={twoFactorPassword} onChange={event=>setTwoFactorPassword(event.target.value)} helperText="Required before switching two-factor authentication ON or OFF." fullWidth sx={fieldSx} />
                {twoFactorBusy && <LinearProgress />}
                {twoFactorError && <Alert severity="error">{twoFactorError}</Alert>}
                {twoFactorMessage && <Alert severity="success">{twoFactorMessage}</Alert>}
              </Stack>
            </Paper>

            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Change Password</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Ensure your account is using a long, random password to stay secure.</Typography>
            
            <Paper component="form" onSubmit={handleChangePassword} sx={{ 
              p: { xs: 3, sm: 4 }, 
              borderRadius: 4, 
              display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 500,
              bgcolor: panelBg,
            }}>
                <TextField 
                    label="Current Password" type="password" 
                    value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    fullWidth size="small"
                    sx={fieldSx}
                />
                <TextField 
                    label="New Password" type="password" 
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth size="small"
                    sx={fieldSx}
                />
                <TextField 
                    label="Confirm New Password" type="password" 
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth size="small"
                    sx={fieldSx}
                />
                
                {passwordError && <Alert severity="error" sx={{ borderRadius: 2 }}>{passwordError}</Alert>}
                {passwordSuccess && <Alert severity="success" sx={{ borderRadius: 2 }}>{passwordSuccess}</Alert>}

                <Button 
                  type="submit" variant="contained" disabled={!currentPassword || !newPassword || changingPassword}
                  sx={{ mt: 1, py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none', boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}` }}
                >
                    {changingPassword ? <CircularProgress size={22} color="inherit" /> : "Update Password"}
                </Button>
            </Paper>
        </TabPanel>

        {/* TEAM TAB */}
        <TabPanel value={tabValue} index={4}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 4,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
                textAlign: { xs: 'center', sm: 'left' }
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.5px' }}>Team Members</Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                  Manage who has access to your boards
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => {
                  setInviteDialogOpen(true);
                  fetchWorkspaces();
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1,
                  px: 3,
                  width: { xs: '100%', sm: 'auto' },
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
                }}
              >
                Invite Teammate
              </Button>
            </Box>
            
            {loadingTeammates ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                    <CircularProgress size={48} thickness={4} />
                </Box>
            ) : teammates.length > 0 ? (
                <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {teammates.map((teammate) => (
                      <Paper
                        key={teammate.id}
                        onClick={() => {
                          if (teammate.status === 'joined') {
                            setSelectedTeammateForAccess(teammate);
                            setAccessDialogOpen(true);
                          }
                        }}
                        sx={{
                          p: { xs: 2.5, sm: 3 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 4,
                          bgcolor: panelBg,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: teammate.status === 'joined' ? 'pointer' : 'default',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 2.5, sm: 0 },
                          '&:hover': teammate.status === 'joined' ? {
                            boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                            transform: 'translateY(-3px)'
                          } : {}
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                          <Box sx={{ position: 'relative' }}>
                            <Avatar
                              src={getAvatarUrl(teammate.avatar)}
                              sx={{ width: 56, height: 56, mx: { xs: 'auto', sm: 0 }, boxShadow: 1 }}
                            />
                            {teammate.status === 'pending' && (
                              <Box sx={{ position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.warning.main }} />
                            )}
                            {teammate.status === 'joined' && (
                              <Box sx={{ position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
                            )}
                          </Box>
                          
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.3px' }}>{teammate.name}</Typography>
                              {teammate.status === 'pending' && (
                                <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), color: theme.palette.warning.dark, px: 1.5, py: 0.25, borderRadius: 999, fontWeight: 800, textTransform: 'uppercase', mt: { xs: 1, sm: 0 } }}>
                                  Pending Invite
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>{teammate.email}</Typography>
                            
                            {teammate.status === 'joined' && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                                <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 700 }}>
                                  Has access to {teammate.access?.length || 0} boards
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-end' }, mt: { xs: 2, sm: 0 } }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTeammate(teammate.id);
                            }}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, width: { xs: '100%', sm: 'auto' }, borderColor: 'transparent', bgcolor: alpha(theme.palette.error.main, 0.08), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.14) } }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                </List>
            ) : (
                <Box sx={{ p: 8, textAlign: 'center', bgcolor: panelBg, borderRadius: 4, boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.55)' }}>
                    <GroupIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                    <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.3px' }}>Build Your Team</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
                        You haven't added any teammates yet. Start collaborating by inviting members to your boards.
                    </Typography>
                    <Button 
                        variant="contained" 
                        size="large"
                        startIcon={<PersonAddIcon />} 
                        onClick={() => { setInviteDialogOpen(true); fetchWorkspaces(); }}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 4, boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}` }}
                    >
                        Invite First Teammate
                    </Button>
                </Box>
            )}
        </TabPanel>

        {/* BILLING TAB */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Plan & Billing</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Review your subscription and change the plan for your team.
          </Typography>

          {loadingBilling ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: panelBg }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">Current plan</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ textTransform: "capitalize" }}>
                      {billingStatus?.plan === "trial" ? "Free Trial" : billingStatus?.plan || "Free Trial"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {billingStatus?.seats_used || 1} of {billingStatus?.seat_limit || 5} seats used
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    <Typography variant="overline" color="text.secondary">
                      {billingStatus?.plan === "trial" ? "Trial ends" : "Next renewal"}
                    </Typography>
                    <Typography fontWeight={700}>
                      {(billingStatus?.trial_ends_at || billingStatus?.current_period_end)
                        ? new Date(billingStatus.trial_ends_at || billingStatus.current_period_end).toLocaleDateString()
                        : "Not scheduled"}
                    </Typography>
                    {(billingStatus?.trial_ends_at || billingStatus?.current_period_end) && (
                      <Typography variant="body2" color="text.secondary">
                        {Math.max(
                          0,
                          Math.ceil(
                            (new Date(
                              billingStatus.plan === "trial"
                                ? billingStatus.trial_ends_at
                                : billingStatus.current_period_end
                            ).getTime() - Date.now()) / 86400000
                          )
                        )} days remaining
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>

              <Box
                sx={{
                  display: "inline-flex",
                  gap: 0.5,
                  p: 0.5,
                  mb: 2,
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                }}
              >
                {(["monthly", "yearly"] as const).map((cycle) => {
                  const selected = billingCycle === cycle;
                  return (
                    <Button
                      key={cycle}
                      size="small"
                      variant={selected ? "contained" : "text"}
                      onClick={() => setBillingCycle(cycle)}
                      sx={{
                        minWidth: 84,
                        px: 2,
                        py: 0.65,
                        borderRadius: 999,
                        textTransform: "capitalize",
                        fontWeight: 800,
                        boxShadow: "none",
                      }}
                    >
                      {cycle}
                    </Button>
                  );
                })}
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                {[
                  { id: "basic", name: "Basic", monthlyPrice: 40, seats: "1-5 seats" },
                  { id: "standard", name: "Standard", monthlyPrice: 75, seats: "6-10 seats" },
                  { id: "pro", name: "Pro", monthlyPrice: 180, seats: "11-20 seats" },
                  { id: "enterprise", name: "Enterprise", monthlyPrice: null, seats: "21+ seats" },
                ].map((plan) => {
                  const current = billingStatus?.plan === plan.id && billingStatus?.status === "active";
                  const price = plan.monthlyPrice == null
                    ? "Custom price"
                    : billingCycle === "yearly"
                      ? `EUR ${Math.round(plan.monthlyPrice * 12 * 0.9)}/year`
                      : `EUR ${plan.monthlyPrice}/month`;
                  return (
                    <Card key={plan.id} variant="outlined" sx={{ borderRadius: 2, bgcolor: panelBg, borderColor: current ? "primary.main" : "divider" }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight={800}>{plan.name}</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ my: 1 }}>{price}</Typography>
                        {billingCycle === "yearly" && plan.monthlyPrice != null && (
                          <Typography variant="caption" color="success.main" fontWeight={800}>Save 10% yearly</Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{plan.seats}</Typography>
                        <Button
                          fullWidth
                          variant={current ? "outlined" : "contained"}
                          disabled={current || Boolean(checkoutPlan)}
                          onClick={() => handleChangePlan(plan.id)}
                          sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                          {checkoutPlan === plan.id
                            ? <CircularProgress size={20} color="inherit" />
                            : current ? "Current plan" : plan.id === "enterprise" ? "Contact sales" : `Change to ${plan.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Audit Log</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Security timeline for invitations, role changes and administrative actions.
          </Typography>
          {loadingAuditLogs ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
          ) : auditLogs.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: panelBg, textAlign: "center" }}>
              <HistoryIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography fontWeight={800}>No enterprise activity yet</Typography>
              <Typography variant="body2" color="text.secondary">New invitations and role changes will appear here.</Typography>
            </Paper>
          ) : (
            <List sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {auditLogs.map((entry) => (
                <Paper key={entry.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: panelBg }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                    <Box>
                      <Typography fontWeight={800}>
                        {entry.action === "member.invited" ? "Member invited" : entry.action === "member.role_changed" ? "Member role changed" : entry.action}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.actor_name || entry.actor_email || "Unknown user"} · {entry.table_name || "Board"}
                        {entry.metadata?.role ? ` · ${entry.metadata.role}` : ""}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{new Date(entry.created_at).toLocaleString()}</Typography>
                  </Stack>
                </Paper>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
          <Typography variant="h5" fontWeight={800} sx={{mb:1}}>Public Sharing</Typography>
          <Typography color="text.secondary" sx={{mb:3}}>Create a secure, view-only link for clients without giving account access.</Typography>
          <Paper sx={{p:3,borderRadius:3,bgcolor:panelBg,maxWidth:720}}>
            <Stack gap={2}>
              <TextField select label="Workspace" value={selectedInviteWs} onChange={(e)=>{setSelectedInviteWs(e.target.value); setShareTableId(""); setShareToken(""); void fetchTablesForInvite(e.target.value);}} SelectProps={{native:true}} sx={fieldSx}>
                <option value="">Select workspace</option>{inviteWorkspaces.map(ws=><option key={ws.id} value={ws.id}>{ws.name}</option>)}
              </TextField>
              <TextField select label="Board" value={shareTableId} onChange={(e)=>{setShareTableId(e.target.value);setShareToken("");}} SelectProps={{native:true}} disabled={!selectedInviteWs} sx={fieldSx}>
                <option value="">Select board</option>{inviteTables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </TextField>
              <TextField label="Portal title" value={portalTitle} onChange={e=>setPortalTitle(e.target.value)} sx={fieldSx}/>
              <TextField label="Welcome message" value={portalWelcome} onChange={e=>setPortalWelcome(e.target.value)} multiline minRows={2} sx={fieldSx}/>
              <TextField type="password" label="Optional password" helperText="At least 8 characters. Leave blank to keep the current password." value={portalPassword} onChange={e=>{setPortalPassword(e.target.value);setPortalRemovePassword(false);}} sx={fieldSx}/>
              <TextField type="datetime-local" label="Optional expiration" value={portalExpiresAt} onChange={e=>setPortalExpiresAt(e.target.value)} InputLabelProps={{shrink:true}} sx={fieldSx}/>
              <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Box><Typography fontWeight={800}>Remove existing password</Typography><Typography variant="body2" color="text.secondary">Make the link accessible without a password</Typography></Box><Switch checked={portalRemovePassword} onChange={e=>{setPortalRemovePassword(e.target.checked);if(e.target.checked)setPortalPassword("");}}/></Box>
              <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Box><Typography fontWeight={800}>Client feedback</Typography><Typography variant="body2" color="text.secondary">Allow clients to leave portal comments</Typography></Box><Switch checked={portalComments} onChange={e=>setPortalComments(e.target.checked)}/></Box>
              <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Box><Typography fontWeight={800}>Allow downloads</Typography><Typography variant="body2" color="text.secondary">Let clients download the shared board data</Typography></Box><Switch checked={portalDownloads} onChange={e=>setPortalDownloads(e.target.checked)}/></Box>
              <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Box><Typography fontWeight={800}>Client approvals</Typography><Typography variant="body2" color="text.secondary">Let clients approve or request changes on individual records</Typography></Box><Switch checked={portalApprovals} onChange={e=>setPortalApprovals(e.target.checked)}/></Box>
              {shareToken && <TextField value={`${window.location.origin}/share/${shareToken}`} InputProps={{readOnly:true}} />}
              <Stack direction={{xs:"column",sm:"row"}} gap={1}>
                <Button variant="contained" disabled={!shareTableId||sharingBusy} onClick={()=>void handlePublicShare(true)}>{sharingBusy?<CircularProgress size={20}/>:shareToken?"Regenerate access":"Enable public link"}</Button>
                {shareToken && <Button variant="outlined" onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`)}>Copy link</Button>}
                {shareToken && <Button color="error" onClick={()=>void handlePublicShare(false)}>Disable</Button>}
              </Stack>
            </Stack>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={8}>
          <Typography variant="h5" fontWeight={800} sx={{mb:1}}>API & Integrations</Typography>
          <Typography color="text.secondary" sx={{mb:3}}>Connect external systems securely. Keys are shown only once.</Typography>
          <Paper sx={{p:3,borderRadius:3,bgcolor:panelBg,maxWidth:760,mb:3}}><Stack direction={{xs:"column",sm:"row"}} gap={1}><TextField fullWidth label="Key name" value={apiKeyName} onChange={e=>setApiKeyName(e.target.value)} sx={fieldSx}/><Button variant="contained" disabled={!apiKeyName.trim()} onClick={()=>void createApiKey()}>Create key</Button></Stack>
          {newApiKey&&<Alert severity="warning" sx={{mt:2}}><Typography fontWeight={800}>Copy this key now</Typography><Typography sx={{wordBreak:"break-all",fontFamily:"monospace"}}>{newApiKey}</Typography><Button size="small" onClick={()=>navigator.clipboard.writeText(newApiKey)}>Copy</Button></Alert>}</Paper>
          <List sx={{display:"flex",flexDirection:"column",gap:1}}>{apiKeys.map(k=><Paper key={k.id} sx={{p:2,borderRadius:2,bgcolor:panelBg,display:"flex",justifyContent:"space-between",alignItems:"center"}}><Box><Typography fontWeight={800}>{k.name}</Typography><Typography variant="body2" color="text.secondary">{k.key_prefix}… · Created {new Date(k.created_at).toLocaleDateString()}</Typography></Box><Button color="error" onClick={()=>void revokeApiKey(k.id)}>Revoke</Button></Paper>)}</List>
          <Alert severity="info" sx={{mt:3,maxWidth:760}}>
            Send the API key in the <strong>x-api-key</strong> header. Available read endpoints:<br />
            <code>GET /api/v1/workspaces</code><br />
            <code>GET /api/v1/boards</code><br />
            <code>GET /api/v1/boards/:boardId</code><br />
            <code>GET /api/v1/boards/:boardId/columns</code><br />
            <code>GET /api/v1/boards/:boardId/rows?limit=50&amp;offset=0</code>
          </Alert>
          <Typography variant="h6" fontWeight={900} sx={{mt:4,mb:1}}>Integration catalog</Typography>
          <Typography variant="body2" color="text.secondary" sx={{mb:2}}>Use signed webhooks and API keys today; OAuth connectors are prepared for the next provider activation.</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{maxWidth:760}}>
            {["Gmail","Outlook","Google Calendar","Slack","WhatsApp","Zapier","Make","Stripe","Google Drive","Dropbox"].map(name=><Chip key={name} label={name} variant="outlined" color="primary" />)}
          </Stack>
          <Typography variant="h6" fontWeight={900} sx={{mt:4,mb:1}}>Signed Webhooks</Typography>
          <Typography variant="body2" color="text.secondary" sx={{mb:2}}>Deliver board and task events to a public HTTPS endpoint with an HMAC signature.</Typography>
          <Paper sx={{p:3,borderRadius:3,bgcolor:panelBg,maxWidth:760}}><Stack gap={1.5}><TextField label="Webhook name" value={webhookName} onChange={e=>setWebhookName(e.target.value)} sx={fieldSx}/><TextField label="HTTPS endpoint" placeholder="https://example.com/webhooks/smart-manage" value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} sx={fieldSx}/><Button variant="contained" disabled={!webhookName.trim()||!webhookUrl.trim()} onClick={()=>void createWebhook()}>Add webhook</Button>{webhookSecret&&<Alert severity="warning"><Typography fontWeight={800}>Copy signing secret now</Typography><Typography sx={{fontFamily:"monospace",wordBreak:"break-all"}}>{webhookSecret}</Typography></Alert>}</Stack></Paper>
          <List sx={{display:"flex",flexDirection:"column",gap:1,mt:2,maxWidth:760}}>{webhooks.map(h=><Paper key={h.id} sx={{p:2,borderRadius:2,bgcolor:panelBg}}><Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" gap={1}><Box><Typography fontWeight={800}>{h.name}</Typography><Typography variant="body2" color="text.secondary" sx={{wordBreak:"break-all"}}>{h.url}</Typography><Typography variant="caption">Last status: {h.last_status||"Never delivered"}</Typography></Box><Stack direction="row" gap={1}><Button onClick={()=>void testWebhook(h.id)}>Test</Button><Button color="error" onClick={()=>void deleteWebhook(h.id)}>Delete</Button></Stack></Stack></Paper>)}</List>
        </TabPanel>

      </Paper>

      {/* Invite Teammate Dialog */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.4)' } }
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(24,24,24,0.9)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            boxShadow: `0 32px 64px ${alpha(theme.palette.common.black, 0.3)}`,
            backgroundImage: 'none',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }
        }}
      >
        <Box sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.3px' }}>Invite Teammate</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Centralized teammate management: add members to any of your boards securely.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Autocomplete
                    fullWidth
                    options={peopleSuggestions}
                    getOptionLabel={(option: any) => `${option.name} (${option.email})`}
                    loading={loadingSuggestions}
                    onInputChange={(event, value) => fetchPeopleSuggestions(value)}
                    onChange={(event, value) => setSelectedUser(value)}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={getAvatarUrl(option.avatar)} sx={{ width: 32, height: 32 }} />
                            <Box>
                                <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                            </Box>
                        </Box>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search Name or Email"
                            placeholder="Type to search..."
                            size="small"
                            sx={fieldSx}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {loadingSuggestions ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                />

                <TextField
                    select
                    label="Select Workspace"
                    fullWidth
                    value={selectedInviteWs}
                    onChange={(e) => {
                        setSelectedInviteWs(e.target.value);
                        fetchTablesForInvite(e.target.value);
                    }}
                    SelectProps={{ native: true }}
                    size="small"
                    sx={fieldSx}
                >
                    {inviteWorkspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Select Board"
                    fullWidth
                    value={selectedInviteTable}
                    onChange={(e) => setSelectedInviteTable(e.target.value)}
                    SelectProps={{ native: true }}
                    size="small"
                    disabled={!selectedInviteWs || inviteTables.length === 0}
                    sx={fieldSx}
                >
                    {inviteTables.length > 0 ? (
                        inviteTables.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))
                    ) : (
                        <option value="">No boards in this workspace</option>
                    )}
                </TextField>

                {/* Enterprise role selection */}
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Enterprise role
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={invitePermission}
                    onChange={(event) => setInvitePermission(event.target.value as 'admin' | 'manager' | 'employee' | 'guest')}
                    SelectProps={{ native: true }}
                    sx={fieldSx}
                  >
                    <option value="admin">Admin — manage board and members</option>
                    <option value="manager">Manager — manage board content</option>
                    <option value="client">Client — portal feedback and files</option>
                    <option value="custom">Custom — configure board access</option>
                    <option value="employee">Employee — create and edit content</option>
                    <option value="guest">Guest — view only</option>
                  </TextField>
                </Box>

                {/* Invite Code Display */}
                {selectedInviteTable && (
                  <Box sx={{
                    mt: 1, p: 2.5, borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1
                  }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.5px' }}>
                      BOARD INVITE CODE
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: 6 }}>
                        {currentTableInviteCode || "------"}
                      </Typography>
                      <Tooltip title="Copy Code">
                        <IconButton size="small" onClick={() => {
                          if (currentTableInviteCode) {
                            navigator.clipboard.writeText(currentTableInviteCode);
                            showNotification("Code copied!", "success");
                          }
                        }} sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
            </Box>

            <Box sx={{ mt: 5, display: 'flex', gap: 2 }}>
                <Button 
                    variant="outlined" fullWidth onClick={() => setInviteDialogOpen(false)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.2, borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06) }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" fullWidth onClick={handleInviteTeammate}
                    disabled={isInviting || !selectedUser || !selectedInviteTable}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.2, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` }}
                >
                    {isInviting ? <CircularProgress size={24} color="inherit" /> : "Send Invite"}
                </Button>
            </Box>
        </Box>
      </Dialog>

      {/* Granular Access Management Dialog */}
      <Dialog
        open={accessDialogOpen}
        onClose={() => {
            setAccessDialogOpen(false);
            setBoardSearchQuery("");
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.4)' } }
        }}
        PaperProps={{
            sx: { 
                borderRadius: 4, height: '80vh', display: 'flex', flexDirection: 'column',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(24,24,24,0.9)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(24px)',
                boxShadow: `0 32px 64px ${alpha(theme.palette.common.black, 0.3)}`,
                backgroundImage: 'none',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
            }
        }}
      >
        <DialogTitle sx={{ p: 4, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 1 }}>
                <Avatar 
                    src={getAvatarUrl(selectedTeammateForAccess?.avatar)} 
                    sx={{ width: 64, height: 64, boxShadow: 1 }} 
                />
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>{selectedTeammateForAccess?.name}</Typography>
                    <Typography variant="body1" color="text.secondary">{selectedTeammateForAccess?.email}</Typography>
                </Box>
            </Box>
            <Divider sx={{ mt: 3, opacity: 0.5 }} />
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 4 }, pt: 0, flex: 1, overflowY: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Shared Access
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Filter workspaces and boards..."
                    value={boardSearchQuery}
                    onChange={(e) => setBoardSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />
                    }}
                    sx={fieldSx}
                />
            </Box>

            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTeammateForAccess?.access?.filter((a: any) => 
                    a.tableName?.toLowerCase().includes(boardSearchQuery.toLowerCase()) || 
                    a.workspaceName?.toLowerCase().includes(boardSearchQuery.toLowerCase())
                ).map((a: any) => (
                    <Paper 
                        key={a.tableId} 
                        variant="outlined" 
                        sx={{ p: 2.5, borderRadius: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'flex-start' }, justifyContent: 'space-between', gap: 2, bgcolor: panelBg, boxShadow: 'none' }}
                    >
                        <Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, letterSpacing: '0.5px' }}>
                                {a.workspaceName}
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800}>{a.tableName}</Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1.25, minWidth: { sm: 320 } }}>
                            <TextField
                                select
                                size="small"
                                value={a.role || (a.permission === 'admin' ? 'admin' : a.permission === 'read' ? 'guest' : 'employee')}
                                onChange={(e) => handleUpdateGranularPermission(selectedTeammateForAccess.id, a.tableId, e.target.value)}
                                SelectProps={{ native: true }}
                                sx={{ 
                                    minWidth: 120,
                                    '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem', fontWeight: 700, bgcolor: inputBg, '& fieldset': { border: 'none' }, '&:hover fieldset': { border: 'none' }, '&.Mui-focused fieldset': { border: 'none' } }
                                }}
                            >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="client">Client</option>
                                <option value="custom">Custom</option>
                                <option value="employee">Employee</option>
                                <option value="guest">Guest</option>
                            </TextField>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5 }}>
                              {Object.entries(BOARD_CAPABILITY_LABELS).map(([key, label]) => {
                                const role = a.role || (a.permission === 'admin' ? 'admin' : a.permission === 'read' ? 'guest' : 'employee');
                                const current = { ...BOARD_ROLE_CAPABILITIES[role], ...(a.capabilities || {}) };
                                return (
                                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                    <Typography variant="caption" fontWeight={700}>{label}</Typography>
                                    <Switch
                                      size="small"
                                      checked={Boolean(current[key])}
                                      onChange={(event) => handleUpdateGranularPermission(
                                        selectedTeammateForAccess.id,
                                        a.tableId,
                                        role,
                                        { ...current, [key]: event.target.checked }
                                      )}
                                      inputProps={{ 'aria-label': `${label} for ${a.tableName}` }}
                                    />
                                  </Box>
                                );
                              })}
                            </Box>
                        </Box>
                    </Paper>
                ))}
            </List>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 4 }, pt: 2 }}>
            <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => setAccessDialogOpen(false)}
                sx={{ borderRadius: 2, py: 1.5, fontWeight: 800, textTransform: 'none', borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06) }}
            >
                Close
            </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
