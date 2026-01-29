import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

// Global SSE connection
let eventSource = null;
let reconnectTimeout = null;
const listeners = {};

const connectSSE = () => {
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;
  
  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  const baseUrl = api.defaults.baseURL || '/api';
  eventSource = new EventSource(`${baseUrl}/events`);
  
  eventSource.onmessage = (event) => {
    try {
      const { type } = JSON.parse(event.data);
      if (listeners[type]) {
        listeners[type].forEach(cb => cb());
      }
    } catch (e) {}
  };
  
  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;
    // Reconnect after 5 seconds, but only if there are listeners
    if (Object.values(listeners).some(arr => arr.length > 0)) {
      reconnectTimeout = setTimeout(connectSSE, 5000);
    }
  };
};

const subscribe = (type, callback) => {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(callback);
  connectSSE();
  return () => {
    listeners[type] = listeners[type].filter(cb => cb !== callback);
  };
};

/**
 * Fetch hook - fetches on mount and when server emits events
 */
export function useSmartRefresh(endpoint, options = {}) {
  const { 
    transform,
    refreshOn = null
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const dataRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (showLoading = true) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      if (showLoading && !dataRef.current) setLoading(true);
      const res = await api.get(endpoint);
      const newData = transform ? transform(res) : res.data;
      dataRef.current = newData;
      setData(newData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (!dataRef.current) setError(err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [endpoint, transform]);

  // Initial fetch - only once
  useEffect(() => {
    fetchData(true);
  }, [endpoint]); // Only depend on endpoint, not fetchData

  // Subscribe to SSE events
  useEffect(() => {
    if (!refreshOn) return;
    return subscribe(refreshOn, () => fetchData(false));
  }, [refreshOn, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, lastUpdated, refresh };
}

// Transform functions (stable references)
const transformOrders = (res) => res.data.orders;
const transformCustomers = (res) => res.data.customers;
const transformDefault = (res) => res.data;

/**
 * Orders hook - refreshes on 'orders' event from server
 */
export function useOrdersRefresh(filter = '') {
  const endpoint = `/orders${filter ? `?status=${filter}` : ''}`;
  return useSmartRefresh(endpoint, {
    transform: transformOrders,
    refreshOn: 'orders'
  });
}

/**
 * Dashboard hook - refreshes on 'dashboard' event from server
 */
export function useDashboardRefresh() {
  return useSmartRefresh('/analytics/dashboard', { 
    transform: transformDefault,
    refreshOn: 'dashboard' 
  });
}

/**
 * Customers hook - refreshes on 'customers' event from server
 */
export function useCustomersRefresh() {
  return useSmartRefresh('/customers', {
    transform: transformCustomers,
    refreshOn: 'customers'
  });
}

/**
 * Menu hook - refreshes on 'menu' event from server
 */
export function useMenuRefresh() {
  return useSmartRefresh('/menu', { 
    transform: transformDefault,
    refreshOn: 'menu' 
  });
}
