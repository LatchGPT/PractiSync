'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  Building2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Clock,
  Send,
  MessageSquareOff,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Row, Snapshot, Identity } from '@/packages/validation/contracts';

interface ReachOutDialogProps {
  data: Snapshot;
  user: Identity;
  onClose: () => void;
  onAuditInitiated?: (details: { coordinatorEmail: string; channel: 'MAILTO' | 'COPY_EMAIL' | 'COPY_TEMPLATE' }) => Promise<void> | void;
}

export default function ReachOutDialog({
  data,
  user,
  onClose,
  onAuditInitiated,
}: ReachOutDialogProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [inquiryTopic, setInquiryTopic] = useState<'GENERAL' | 'DTR' | 'CLEARANCE' | 'INCIDENT'>('GENERAL');
  const [customNote, setCustomNote] = useState('');

  // Find student's placement & assigned class
  const placement = useMemo(() => {
    return data.placements.find((p) => p.studentId === user.id) ?? data.placements[0];
  }, [data.placements, user.id]);

  const enrolledClass = useMemo(() => {
    if (!placement) return null;
    return data.classes.find((c) => c.id === placement.classId);
  }, [data.classes, placement]);

  // Resolve assigned coordinator
  const coordinator = useMemo(() => {
    if (!enrolledClass?.coordinatorId) {
      return data.users.find((u) => u.role === 'COORDINATOR');
    }
    return data.users.find((u) => u.id === enrolledClass.coordinatorId);
  }, [data.users, enrolledClass]);

  // Fallback if coordinator is missing
  const fallbackEmail = 'ojt.coe@rtu.edu.ph';
  const resolvedEmail = String(coordinator?.email ?? fallbackEmail);
  const coordinatorName = String(coordinator?.name ?? 'COE Practicum Office');
  const isFallbackOffice = !coordinator?.email;

  const studentName = user.name;
  const studentCourse = String(
    data.courses.find((c) => c.id === user.courseId)?.name ?? 'BS Information Technology'
  );
  const studentSection = String(placement?.section ?? enrolledClass?.section ?? 'Practicum Section');
  const companyName = String(placement?.companyName ?? 'Host Training Establishment');

  // Generate Email Subject & Pre-filled Body
  const topicLabel = {
    GENERAL: 'Practicum Academic Inquiry',
    DTR: 'Attendance & DTR Confirmation Question',
    CLEARANCE: 'Document Clearance Requirement Assistance',
    INCIDENT: 'Urgent Workplace Concern / Safety Report',
  }[inquiryTopic];

  const emailSubject = `[PractiSync] ${topicLabel} — ${studentName} (${studentSection})`;

  const emailBody = useMemo(() => {
    const lines = [
      `Dear ${isFallbackOffice ? 'COE Practicum Coordinator / Office' : `Prof. ${coordinatorName}`},`,
      '',
      `I am reaching out regarding my OJT practicum placement with ${companyName}.`,
      '',
      customNote.trim()
        ? `Inquiry / Summary:\n${customNote.trim()}\n`
        : 'Inquiry / Summary:\n[Please describe your question, requirement, or update here]\n',
      '—',
      'Student Information:',
      `Name: ${studentName}`,
      `Course: ${studentCourse}`,
      `Section: ${studentSection}`,
      `Host Company: ${companyName}`,
      `Placement Reference: ${placement?.id ?? 'N/A'}`,
      'Sent via PractiSync Academic Workspace',
    ];
    return lines.join('\n');
  }, [isFallbackOffice, coordinatorName, companyName, customNote, studentName, studentCourse, studentSection, placement]);

  const mailtoUrl = `mailto:${resolvedEmail}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(resolvedEmail);
      setCopiedEmail(true);
      toast.success(`Copied ${resolvedEmail} to clipboard.`);
      onAuditInitiated?.({ coordinatorEmail: resolvedEmail, channel: 'COPY_EMAIL' });
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      toast.error('Could not copy email to clipboard.');
    }
  };

  const handleCopyTemplate = async () => {
    try {
      const fullText = `To: ${resolvedEmail}\nSubject: ${emailSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedTemplate(true);
      toast.success('Email draft copied to clipboard.');
      onAuditInitiated?.({ coordinatorEmail: resolvedEmail, channel: 'COPY_TEMPLATE' });
      setTimeout(() => setCopiedTemplate(false), 2200);
    } catch {
      toast.error('Could not copy template.');
    }
  };

  const handleLaunchEmailClient = () => {
    onAuditInitiated?.({ coordinatorEmail: resolvedEmail, channel: 'MAILTO' });
    toast.info('Opening your device’s default email application...');
    // Trigger mailto link
    window.location.href = mailtoUrl;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reachout-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(14, 42, 87, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -10px rgba(14, 42, 87, 0.25)',
          border: '1px solid #dbe5f2',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #eef3f9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #fbfdff 0%, #f4f8fc 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#edf4fd',
                  color: '#124c91',
                  border: '1px solid #c9defc',
                }}
              >
                <Mail size={12} />
                Native Email Direct Routing
              </span>
            </div>
            <h2
              id="reachout-dialog-title"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#0e2a57',
                letterSpacing: '-0.01em',
              }}
            >
              Contact Your Practicum Coordinator
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5e7490', lineHeight: 1.45 }}>
              Prepare and launch an official email to your assigned coordinator using your device’s native mail app.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748b',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Resolved Coordinator Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#124c91',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                {coordinatorName
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '15px', color: '#0e2a57' }}>{coordinatorName}</strong>
                  {isFallbackOffice ? (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 600,
                      }}
                    >
                      General Office Fallback
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#edf8f3',
                        color: '#166b42',
                        fontWeight: 600,
                      }}
                    >
                      Assigned Coordinator
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {enrolledClass ? `${enrolledClass.section} · ${enrolledClass.name}` : studentCourse}
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#124c91',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Mail size={13} />
                  <span>{resolvedEmail}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyEmail}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: copiedEmail ? '#166b42' : '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Copy official email address"
            >
              {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
            </button>
          </div>

          {/* Privacy & No-Chat Statement */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: '12px',
              color: '#166534',
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#16a34a' }} />
            <div>
              <strong>Academic Privacy Standard:</strong> PractiSync launches your native email client directly.
              To preserve student safety and confidentiality, PractiSync does not store internal chat logs or
              claim false delivery confirmation.
            </div>
          </div>

          {/* Inquiry Topic Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Reason for Contact:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {(
                [
                  { id: 'GENERAL', label: 'General Inquiry' },
                  { id: 'DTR', label: 'DTR / Attendance' },
                  { id: 'CLEARANCE', label: 'Clearances & Forms' },
                  { id: 'INCIDENT', label: 'Urgent Concern' },
                ] as const
              ).map((topic) => {
                const isChosen = inquiryTopic === topic.id;
                return (
                  <button
                    type="button"
                    key={topic.id}
                    onClick={() => setInquiryTopic(topic.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${isChosen ? '#124c91' : '#cbd5e1'}`,
                      backgroundColor: isChosen ? '#edf4fd' : '#ffffff',
                      color: isChosen ? '#124c91' : '#334155',
                      fontSize: '12px',
                      fontWeight: isChosen ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Message Summary */}
          <div>
            <label
              htmlFor="reachout-note"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '4px',
              }}
            >
              <span>Brief Note / Summary (Will be included in the email draft):</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Optional</span>
            </label>
            <textarea
              id="reachout-note"
              rows={3}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Inquiring about MOA document verification or signature schedule..."
              maxLength={800}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                lineHeight: 1.45,
                color: '#1e293b',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Draft Preview Box */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Email Draft Preview
              </span>
              <button
                type="button"
                onClick={handleCopyTemplate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedTemplate ? '#166b42' : '#124c91',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copiedTemplate ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedTemplate ? 'Copied Full Draft' : 'Copy Full Draft'}</span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              <strong>Subject:</strong> {emailSubject}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #eef3f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Clicking will open Outlook, Apple Mail, or default webmail.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleLaunchEmailClient}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(180deg, #13529d 0%, #0d3c74 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(18, 76, 145, 0.2)',
              }}
            >
              <Mail size={15} />
              <span>Open Email App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
