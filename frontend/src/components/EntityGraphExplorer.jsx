import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Share2,
  Smartphone,
  Users,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
  RefreshCw,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function EntityGraphExplorer({
  graphData,
  summaryData,
  loading,
  onFilterChange,
  activeFilter = 'ALL',
}) {
  const navigate = useNavigate();

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hoveredEntityId, setHoveredEntityId] = useState(null);
  const [focusedNetworkId, setFocusedNetworkId] = useState(null);

  const nodes = useMemo(() => graphData?.nodes || [], [graphData]);
  const edges = useMemo(() => graphData?.edges || [], [graphData]);
  const networks = useMemo(() => graphData?.networks || [], [graphData]);
  const summary = summaryData || graphData?.summary || {};

  // Fast node lookup map
  const nodesMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Handle network quick-focus
  const handleNetworkSelect = (netId) => {
    if (focusedNetworkId === netId) {
      setFocusedNetworkId(null);
    } else {
      setFocusedNetworkId(netId);
      const network = networks.find((n) => n.id === netId);
      if (network && network.hub_entity) {
        const hubNode = nodesMap.get(network.hub_entity);
        if (hubNode) setSelectedEntity(hubNode);
      }
    }
  };

  // Determine active highlighted nodes/edges
  const activeFocusId = selectedEntity?.id || hoveredEntityId;
  const connectedNodeIds = useMemo(() => {
    if (!activeFocusId) return new Set();
    const set = new Set([activeFocusId]);
    edges.forEach((e) => {
      if (e.source === activeFocusId) set.add(e.target);
      if (e.target === activeFocusId) set.add(e.source);
    });
    return set;
  }, [activeFocusId, edges]);

  // Nodes to display (considering focused network)
  const visibleNodes = useMemo(() => {
    if (!focusedNetworkId) return nodes;
    const targetNet = networks.find((n) => n.id === focusedNetworkId);
    if (!targetNet) return nodes;
    const allowedIds = new Set([
      targetNet.hub_entity,
      ...(targetNet.member_accounts || []),
    ]);
    return nodes.filter((n) => allowedIds.has(n.id));
  }, [nodes, focusedNetworkId, networks]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => {
    return edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
  }, [edges, visibleNodeIds]);

  return (
    <section
      id="entity-graph-explorer"
      className="bg-[#143834] border border-[#286056] rounded-xl overflow-hidden shadow-xl"
    >
      {/* 1. Header & Surveillance Metrics Bar */}
      <div className="p-5 border-b border-[#286056] bg-gradient-to-r from-[#173F3A] to-[#122E25]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2E2313] border border-[#784F17] flex items-center justify-center text-amber-400">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Entity Graph Explorer
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold tracking-wide">
                    Live Surveillance
                  </span>
                </h2>
                <p className="text-xs text-[#9BC3AC] mt-0.5">
                  Visual relationship topology tracking device collusion, beneficiary aggregation, and pass-through smurfing.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#221B13] border border-[#8D5B18] text-amber-300 flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>{summary.suspected_accounts_count ?? 8} Suspected Mule Accounts</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#1C4841] border border-[#286056] text-[#E6F4ED] flex items-center gap-1.5 font-medium">
              <Share2 className="w-3.5 h-3.5 text-[#4EBEA3]" />
              <span>{summary.suspected_networks_count ?? 3} Detected Networks</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#1C4841] border border-[#286056] text-[#9BC3AC] hidden sm:flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{summary.total_entities_monitored ?? 23} Entities</span>
            </div>
          </div>
        </div>

        {/* Filter Pills & Network Quick-Selectors */}
        <div className="mt-4 pt-3 border-t border-[#286056]/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Entity Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Entities' },
              { id: 'SUSPECTED', label: 'Suspected Only' },
              { id: 'ACCOUNT', label: 'Accounts' },
              { id: 'DEVICE', label: 'Devices' },
              { id: 'BENEFICIARY', label: 'Beneficiaries' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onFilterChange && onFilterChange(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-[#4EBEA3] text-[#0B1E1C] font-semibold shadow-sm'
                    : 'bg-[#1C4841] text-[#9BC3AC] hover:text-white hover:bg-[#286056]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Network Focus Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] text-[#9BC3AC]/70 font-medium">Focus Network:</span>
            {networks.map((net, idx) => (
              <button
                key={net.id}
                onClick={() => handleNetworkSelect(net.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap border ${
                  focusedNetworkId === net.id
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400 font-semibold'
                    : 'bg-[#1C4841] text-[#9BC3AC] border-[#286056] hover:text-white'
                }`}
              >
                #{idx + 1} {(net.rule || '').replace('_', ' ')}
              </button>
            ))}
            {focusedNetworkId && (
              <button
                onClick={() => setFocusedNetworkId(null)}
                className="text-[10px] px-2 py-1 text-rose-300 hover:text-rose-200 underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive Graph Canvas Area */}
      <div className="relative flex flex-col lg:flex-row min-h-[520px] bg-[#0E2824] overflow-hidden">
        {/* Left / Main: SVG Topology */}
        <div className="flex-1 relative flex items-center justify-center p-2 min-h-[480px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#9BC3AC]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#4EBEA3]" />
              <span className="text-xs">Loading surveillance network...</span>
            </div>
          ) : (
            <svg
              viewBox="0 0 940 560"
              className="w-full h-full max-h-[560px] select-none"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
            >
              <defs>
                {/* Arrow Markers */}
                <marker
                  id="mule-arrow-normal"
                  viewBox="0 0 10 10"
                  refX="25"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#286056" />
                </marker>
                <marker
                  id="mule-arrow-suspicious"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B" />
                </marker>
                <marker
                  id="mule-arrow-active"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#4EBEA3" />
                </marker>

                {/* Glow Filter */}
                <filter id="mule-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Cluster Background Halos */}
              <g className="cluster-halos" opacity="0.35">
                <circle cx="220" cy="180" r="140" fill="#2E2313" stroke="#8D5B18" strokeDasharray="4 4" />
                <text x="220" y="35" textAnchor="middle" fill="#FBBF24" fontSize="11" fontWeight="700" letterSpacing="1">
                  NETWORK #1: HARDWARE COLLUSION
                </text>

                <circle cx="680" cy="180" r="140" fill="#2E2313" stroke="#8D5B18" strokeDasharray="4 4" />
                <text x="680" y="35" textAnchor="middle" fill="#FBBF24" fontSize="11" fontWeight="700" letterSpacing="1">
                  NETWORK #2: BENEFICIARY AGGREGATION
                </text>

                <circle cx="450" cy="440" r="100" fill="#2E2313" stroke="#8D5B18" strokeDasharray="4 4" />
                <text x="450" y="552" textAnchor="middle" fill="#FBBF24" fontSize="11" fontWeight="700" letterSpacing="1">
                  NETWORK #3: PASS-THROUGH SMURFING RELAY
                </text>
              </g>

              {/* 1. Edges / Relationship Connections */}
              <g className="edges">
                {visibleEdges.map((edge) => {
                  const sNode = nodesMap.get(edge.source);
                  const tNode = nodesMap.get(edge.target);
                  if (!sNode || !tNode) return null;

                  const isConnectedToActive =
                    activeFocusId &&
                    (edge.source === activeFocusId || edge.target === activeFocusId);
                  const isDimmed = activeFocusId && !isConnectedToActive;

                  const strokeColor = isConnectedToActive
                    ? '#4EBEA3'
                    : edge.is_suspicious
                    ? '#F59E0B'
                    : '#286056';
                  const strokeWidth = isConnectedToActive ? 2.5 : edge.is_suspicious ? 1.8 : 1.2;
                  const markerId = isConnectedToActive
                    ? 'url(#mule-arrow-active)'
                    : edge.is_suspicious
                    ? 'url(#mule-arrow-suspicious)'
                    : 'url(#mule-arrow-normal)';

                  const relText = (edge.relationship || '').replace('_', ' ');

                  return (
                    <g key={edge.id} opacity={isDimmed ? 0.15 : 1} className="transition-opacity duration-200">
                      <line
                        x1={sNode.x ?? 0}
                        y1={sNode.y ?? 0}
                        x2={tNode.x ?? 0}
                        y2={tNode.y ?? 0}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={edge.is_suspicious ? '5 3' : 'none'}
                        markerEnd={markerId}
                      />
                      {/* Edge Label on hover or active */}
                      {edge.is_suspicious && relText && (
                        <text
                          x={((sNode.x ?? 0) + (tNode.x ?? 0)) / 2}
                          y={((sNode.y ?? 0) + (tNode.y ?? 0)) / 2 - 6}
                          textAnchor="middle"
                          fill={isConnectedToActive ? '#4EBEA3' : '#FBBF24'}
                          fontSize="8"
                          fontWeight="600"
                          className="select-none pointer-events-none"
                        >
                          {relText}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* 2. Nodes Rendering */}
              <g className="nodes">
                {visibleNodes.map((node) => {
                  const isSelected = selectedEntity?.id === node.id;
                  const isConnected = connectedNodeIds.has(node.id);
                  const isDimmed = activeFocusId && !isConnected;
                  const nodeLabel = node.label || node.id || 'Entity';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                      opacity={isDimmed ? 0.25 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredEntityId(node.id)}
                      onMouseLeave={() => setHoveredEntityId(null)}
                      onClick={() => setSelectedEntity(isSelected ? null : node)}
                    >
                      {/* Pulsing ring for suspected mule accounts - opacity pulse only, safe in all SVG engines */}
                      {node.is_suspected && (
                        <circle
                          r={isSelected ? 26 : 22}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="1.5"
                          opacity="0.5"
                          className="animate-pulse"
                        />
                      )}

                      {/* Selected Halo Ring */}
                      {isSelected && (
                        <circle
                          r="26"
                          fill="none"
                          stroke="#4EBEA3"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Node Shape by Type */}
                      {node.type === 'account' ? (
                        // Account: Circle
                        <g>
                          <circle
                            r="18"
                            fill={node.is_suspected ? '#2C1B0A' : '#143834'}
                            stroke={
                              isSelected
                                ? '#4EBEA3'
                                : node.is_suspected
                                ? '#F59E0B'
                                : '#2DD4BF'
                            }
                            strokeWidth={node.is_suspected ? '2.5' : '1.5'}
                            filter={node.is_suspected ? 'url(#mule-glow)' : undefined}
                          />
                          {/* Inner Icon Indicator */}
                          <circle
                            r="6"
                            fill={node.is_suspected ? '#F59E0B' : '#2DD4BF'}
                          />
                        </g>
                      ) : node.type === 'device' ? (
                        // Device: Rounded Square
                        <g>
                          <rect
                            x="-16"
                            y="-16"
                            width="32"
                            height="32"
                            rx="8"
                            fill="#261738"
                            stroke={isSelected ? '#4EBEA3' : '#A855F7'}
                            strokeWidth="2"
                          />
                          <circle r="4" fill="#C084FC" />
                        </g>
                      ) : (
                        // Beneficiary: Diamond
                        <g>
                          <polygon
                            points="0,-18 18,0 0,18 -18,0"
                            fill={node.is_suspected ? '#35141D' : '#122E25'}
                            stroke={
                              isSelected
                                ? '#4EBEA3'
                                : node.is_suspected
                                ? '#F43F5E'
                                : '#34D399'
                            }
                            strokeWidth="2"
                          />
                          <circle r="4" fill={node.is_suspected ? '#FB7185' : '#34D399'} />
                        </g>
                      )}

                      {/* Node Text Labels */}
                      <text
                        y="30"
                        textAnchor="middle"
                        fill={isSelected ? '#4EBEA3' : node.is_suspected ? '#FDE68A' : '#E6F4ED'}
                        fontSize="10"
                        fontWeight="600"
                        className="pointer-events-none"
                      >
                        {nodeLabel.length > 20 ? `${nodeLabel.slice(0, 18)}…` : nodeLabel}
                      </text>
                      <text
                        y="42"
                        textAnchor="middle"
                        fill="#9BC3AC"
                        fontSize="8.5"
                        fontFamily="monospace"
                        className="pointer-events-none"
                      >
                        {node.id}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Canvas Bottom Legend Bar */}
          <div className="absolute bottom-2.5 left-3 right-3 sm:right-auto bg-[#143834]/90 backdrop-blur-sm border border-[#286056] rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[#9BC3AC]">
            <span className="font-semibold text-white">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-amber-300"></span>
              Suspected Mule
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF]"></span>
              Monitored Account
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#A855F7]"></span>
              Shared Device
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#F43F5E]"></span>
              Beneficiary Funnel
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b border-dashed border-[#F59E0B]"></span>
              Collusion Link
            </span>
          </div>
        </div>

        {/* Right: Entity Detail Inspector Drawer */}
        {selectedEntity && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#286056] bg-[#143834] p-5 flex flex-col justify-between overflow-y-auto max-h-[540px]">
            <div className="space-y-4">
              {/* Header with Close */}
              <div className="flex items-start justify-between gap-2 border-b border-[#286056] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      selectedEntity.type === 'account'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : selectedEntity.type === 'device'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {selectedEntity.type === 'account' ? (
                      <Users className="w-5 h-5" />
                    ) : selectedEntity.type === 'device' ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedEntity.label || selectedEntity.id}</h3>
                    <p className="text-[11px] font-mono text-[#9BC3AC]">{selectedEntity.id}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 rounded hover:bg-[#1C4841] text-[#9BC3AC] hover:text-white transition-colors cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Classification Badge */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#9BC3AC] font-semibold block mb-1">
                  Surveillance Classification
                </span>
                {selectedEntity.is_suspected ? (
                  <div className="p-2.5 rounded-lg bg-[#2E2313] border border-[#8D5B18] text-amber-300 text-xs flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{selectedEntity.mule_status || 'Suspected Mule Account'}</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#1C4841] border border-[#286056] text-[#9BC3AC] text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#4EBEA3] shrink-0" />
                    <span>Monitored Banking Entity</span>
                  </div>
                )}
              </div>

              {/* Detection & Collusion Reasons */}
              {selectedEntity.suspicion_reasons && selectedEntity.suspicion_reasons.length > 0 && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#9BC3AC] font-semibold block mb-1.5">
                    Reason for Suspicion
                  </span>
                  <div className="space-y-1.5">
                    {selectedEntity.suspicion_reasons.map((reason, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#1C4841]/70 border border-[#286056] text-xs text-[#E6F4ED] leading-relaxed"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Entities Links */}
              {selectedEntity.connected_entities && selectedEntity.connected_entities.length > 0 && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#9BC3AC] font-semibold block mb-1.5">
                    Direct Connections ({selectedEntity.connected_entities.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntity.connected_entities.map((connId) => {
                      const targetNode = nodesMap.get(connId);
                      return (
                        <button
                          key={connId}
                          onClick={() => targetNode && setSelectedEntity(targetNode)}
                          className="px-2.5 py-1 rounded bg-[#1C4841] hover:bg-[#286056] border border-[#286056] text-xs text-[#9BC3AC] hover:text-white font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{connId}</span>
                          <ChevronRight className="w-3 h-3 text-[#4EBEA3]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Related Transactions */}
              {selectedEntity.related_transactions && selectedEntity.related_transactions.length > 0 && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#9BC3AC] font-semibold block mb-1.5">
                    Associated Transactions ({selectedEntity.related_transactions.length})
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedEntity.related_transactions.map((txn, idx) => {
                      const txId = txn?.transaction_id || '';
                      const amt = Number(txn?.amount || 0);
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#1C4841] border border-[#286056] flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">
                              ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono text-[#9BC3AC]/70">
                              {txId ? `${txId.slice(0, 8)}...` : 'N/A'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                txn?.status === 'BLOCKED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {txn?.status || 'COMPLETED'}
                            </span>
                            {txId && (
                              <button
                                onClick={() => navigate(`/analyst/transactions/${txId}`)}
                                className="p-1 rounded bg-[#286056] hover:bg-[#3D8577] text-white transition-colors cursor-pointer"
                                title="Open Transaction Dossier"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mandatory Safety Terminology Disclaimer */}
            <div className="mt-4 pt-3 border-t border-[#286056]/60">
              <div className="p-2.5 rounded-lg bg-[#1C4841]/50 border border-[#286056] text-[11px] text-[#9BC3AC] leading-normal flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Investigative Signal:</strong> Mule detection indicates behavioral collusion or rapid aggregation. It is an investigative risk lead and not confirmation of criminal liability.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
