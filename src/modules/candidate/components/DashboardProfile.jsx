import React, { useState, useEffect } from "react";
import CandidateProfile from "../pages/CandidateProfile";

export default function DashboardProfile({ candidateId }) {
  // Auto-enter edit mode if redirected from Change photo/resume in job application
  const [editMode, setEditMode] = useState(() => !!sessionStorage.getItem("targetProfileField"));
  const [isDirty, setIsDirty] = useState(false);

  const handleEdit = () => setEditMode(true);

  const handleCancelEdit = () => {
    if (isDirty && !window.confirm("Discard changes?")) return;

    setEditMode(false);
    setIsDirty(false);
  };

  const handleSave = async (data) => {
    // Profile data is already saved by CandidateProfile's handleSaveStep via updateCandidateProfile API call
    setEditMode(false);
    setIsDirty(false);
  };

  return (
    <CandidateProfile
      candidateUserIdProp={candidateId}
      readOnly={!editMode}
      isEditFlow={editMode}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancelEdit}
      setIsDirty={setIsDirty}
      showHeader={false}
    />
  );
}