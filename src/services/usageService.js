import { supabase } from '../config/supabase';

const SESSION_KEY = 'first-company-usage-session';
const LAST_EVENT_KEY = 'first-company-last-usage-event';

function sessionId() {
  let value = window.sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = window.crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

function deviceInfo() {
  const width = window.innerWidth;
  const agent = navigator.userAgent;
  const device = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  const browser = /Edg\//.test(agent) ? 'Edge'
    : /Firefox\//.test(agent) ? 'Firefox'
      : /Chrome\//.test(agent) ? 'Chrome'
        : /Safari\//.test(agent) ? 'Safari' : 'Other';
  const os = /Android/.test(agent) ? 'Android'
    : /iPhone|iPad|iPod/.test(agent) ? 'iOS'
      : /Windows/.test(agent) ? 'Windows'
        : /Mac OS/.test(agent) ? 'macOS'
          : /Linux/.test(agent) ? 'Linux' : 'Other';
  return { device, browser, os };
}

export function featureForPath(pathname) {
  if (pathname.startsWith('/platform')) return 'audit_log';
  if (pathname.startsWith('/cars')) return 'vehicle_center';
  if (pathname.startsWith('/containers')) return 'containers';
  if (pathname.startsWith('/finance') || pathname.startsWith('/payments')) return 'finance';
  if (pathname.startsWith('/subscription')) return 'release_notes';
  if (pathname.startsWith('/updates')) return 'release_notes';
  return 'vehicle_center';
}

export async function recordUsage({ organizationId, pathname, eventName = 'page_view', featureCode }) {
  if (!organizationId || document.visibilityState !== 'visible') return;
  const marker = `${pathname}:${eventName}`;
  const previous = JSON.parse(window.sessionStorage.getItem(LAST_EVENT_KEY) || '{}');
  if (previous.marker === marker && Date.now() - Number(previous.at || 0) < 60_000) return;

  const { device, browser, os } = deviceInfo();
  const { error } = await supabase.rpc('record_usage_event', {
    p_organization_id: organizationId,
    p_session_id: sessionId(),
    p_feature_code: featureCode || featureForPath(pathname),
    p_event_name: eventName,
    p_path: pathname,
    p_device_type: device,
    p_browser_family: browser,
    p_os_family: os,
  });
  if (!error) window.sessionStorage.setItem(LAST_EVENT_KEY, JSON.stringify({ marker, at: Date.now() }));
}

export async function loadPublishedReleases() {
  const { data, error } = await supabase
    .from('release_notes')
    .select('*')
    .eq('status', 'published')
    .order('released_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
