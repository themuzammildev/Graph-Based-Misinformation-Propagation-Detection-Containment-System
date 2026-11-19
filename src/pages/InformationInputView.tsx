import React, { useState } from 'react';
import { UserNode, InformationMessage, PropositionalRiskResult } from '../types';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Binary,
  Calculator,
  ArrowRight,
  Info,
} from 'lucide-react';

interface InformationInputViewProps {
  nodes: UserNode[];
  message: InformationMessage;
  riskResult: PropositionalRiskResult;
  onUpdateMessage: (msg: InformationMessage) => void;
  onNavigateToSimulator: () => void;
}

export const InformationInputView: React.FC<InformationInputViewProps> = ({
  nodes,
  message,
  riskResult,
  onUpdateMessage,
  onNavigateToSimulator,
}) => {
  const [formText, setFormText] = useState(message.text);
  const [formTopic, setFormTopic] = useState(message.claimTopic);
  const [formSource, setFormSource] = useState(message.sourceUserId);
  const [formVerified, setFormVerified] = useState(message.verified);
  const [formShares, setFormShares] = useState(message.shares);
  const [formSources, setFormSources] = useState(message.independentSources);

  React.useEffect(() => {
    setFormText(message.text);
    setFormTopic(message.claimTopic);
    setFormSource(message.sourceUserId);
    setFormVerified(message.verified);
    setFormShares(message.shares);
    setFormSources(message.independentSources);
  }, [message]);

  React.useEffect(() => {
    if (nodes.length > 0 && !nodes.some((n) => n.id === formSource)) {
      setFormSource(nodes[0].id);
      setFormVerified(nodes[0].verified);
      setFormShares(nodes[0].shares);
      setFormSources(nodes[0].independentSources);
    }
  }, [nodes, formSource]);

  const handleSourceChange = (newSourceId: string) => {
    setFormSource(newSourceId);
    const selectedUser = nodes.find((n) => n.id === newSourceId);
    if (selectedUser) {
      setFormVerified(selectedUser.verified);
      setFormShares(selectedUser.shares);
      setFormSources(selectedUser.independentSources);
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedShares = Math.max(0, Math.floor(Number(formShares) || 0));
    const sanitizedSources = Math.max(0, Math.floor(Number(formSources) || 0));

    onUpdateMessage({
      text: formText.trim() || 'Simulated network message claim payload.',
      claimTopic: formTopic.trim() || 'General Information Dissemination',
      sourceUserId: formSource || (nodes[0]?.id ?? 'U01'),
      verified: formVerified,
      shares: sanitizedShares,
      independentSources: sanitizedSources,
    });
  };

  const { V, S, I, U } = riskResult.propositionStates;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Message & Logic Risk Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Propositional Calculus & Credibility Modeling for Claim Payloads
        </p>
      </div>

      {/* Academic Context Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3 shadow-2xs">
        <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold block text-blue-950">
            Propositional Logic Formalism Notice
          </strong>
          <p className="text-blue-800 leading-relaxed">
            This module maps structural message attributes (source verification status V, viral share count S, and independent corroborating sources I) to a deterministic <strong className="text-blue-950">Propagation Risk</strong> metric. It is an educational simulation of logic-based risk and does not claim to verify real-world facts.
          </p>
        </div>
      </div>

      {/* Main Grid: Form Left, Logic Output Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Message & Authoring Parameters */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Message Payload & Author Attributes
            </h2>
            <p className="text-xs text-slate-500">
              Parameters mapped directly into propositional variables V, S, I
            </p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            {/* Message Text */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Message Content
              </label>
              <textarea
                rows={3}
                required
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                placeholder="Enter information message payload..."
              />
            </div>

            {/* Claim Topic */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Claim Topic / Headline
              </label>
              <input
                type="text"
                required
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Source Origin Node */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source Origin Node (Author)
              </label>
              <select
                value={formSource}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id} — {n.name} ({n.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Verification Status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source Verification Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormVerified(true)}
                  className={`rounded-md border py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    formVerified
                      ? 'border-green-300 bg-green-50 text-green-800 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Verified Source</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormVerified(false)}
                  className={`rounded-md border py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    !formVerified
                      ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Unverified Source</span>
                </button>
              </div>
            </div>

            {/* Historical Share Count (S) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Viral Share Count
                </label>
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {formShares} shares
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="5"
                value={formShares}
                onChange={(e) => setFormShares(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>0 (Quiet)</span>
                <span>Threshold: ≥ 50 (Viral)</span>
                <span>300 (Massive)</span>
              </div>
            </div>

            {/* Independent Sources (I) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Independent Corroborating Sources
                </label>
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {formSources} source(s)
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="10"
                value={formSources}
                onChange={(e) => setFormSources(Number(e.target.value))}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">High credibility if Sources ≥ 2</span>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calculator className="h-4 w-4" />
              <span>Evaluate Logic-Based Risk</span>
            </button>
          </form>
        </div>

        {/* Right Column (7 cols): Mathematical Logic Evaluation & Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Risk Score Outcome Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Risk Assessment Output
                </span>
                <div className="text-xl font-bold font-sans text-slate-900 mt-0.5">
                  {riskResult.riskCategory} Propagation Risk
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold font-mono text-blue-600 tabular-nums">
                  {riskResult.riskScore}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Credibility: {riskResult.credibilityScore}%
                </div>
              </div>
            </div>

            {/* Credibility / Risk Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>0 (High Risk)</span>
                <span>30</span>
                <span>60</span>
                <span>100 (Low Risk)</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    riskResult.riskCategory === 'High'
                      ? 'bg-red-600'
                      : riskResult.riskCategory === 'Moderate'
                      ? 'bg-amber-500'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${riskResult.riskScore}%` }}
                />
              </div>
            </div>

            {/* Proposition States Grid */}
            <div className="rounded-md bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
                Verification & Viral Risk Indicators:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="rounded border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <div className="text-slate-500 text-[10px]">Verified Account</div>
                  <div className={`font-bold text-sm ${V ? 'text-green-700' : 'text-slate-400'}`}>
                    {V ? 'YES' : 'NO'}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <div className="text-slate-500 text-[10px]">Unverified Account</div>
                  <div className={`font-bold text-sm ${U ? 'text-amber-700' : 'text-slate-400'}`}>
                    {U ? 'YES' : 'NO'}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <div className="text-slate-500 text-[10px]">Viral Shares (≥ 50)</div>
                  <div className={`font-bold text-sm ${S ? 'text-red-700' : 'text-slate-400'}`}>
                    {S ? 'YES' : 'NO'}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <div className="text-slate-500 text-[10px]">Multiple Sources (≥ 2)</div>
                  <div className={`font-bold text-sm ${I ? 'text-green-700' : 'text-slate-400'}`}>
                    {I ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Propositional Calculus Rules & Additive Scoring Breakdown */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Binary className="h-4 w-4 text-blue-600" />
              <span>Logic Rules & Credibility Weights Breakdown</span>
            </h3>

            <div className="space-y-2 text-xs">
              {riskResult.scoringBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/70 p-2.5 font-mono"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <p className="text-[11px] text-slate-500 font-sans">{item.reason}</p>
                  </div>
                  <div
                    className={`font-bold text-sm shrink-0 ml-3 tabular-nums ${
                      item.delta > 0
                        ? 'text-green-700'
                        : item.delta < 0
                        ? 'text-red-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-md bg-blue-50/70 border border-blue-200 p-3 text-xs font-mono text-blue-900">
              <span className="font-semibold block text-[10px] text-blue-700 uppercase tracking-wider mb-1">
                Triggered Risk Assessment Rules:
              </span>
              {riskResult.satisfiedRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onNavigateToSimulator}
              className="w-full mt-2 rounded-md bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Simulate Network Spread with this Message</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
