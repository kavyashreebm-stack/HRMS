import React from "react";
import { motion } from "framer-motion";
import NewApplicationForm from "../../../candidate/components/application/NewApplicationForm";

export default function ApplicationPreviewDrawer({ application, onClose }) {
  if (!application) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className="fixed top-0 right-0 w-[1300px] h-full bg-white shadow-xl overflow-y-auto z-50"
    >
      <div className="flex justify-between p-6 border-b">
        <h2 className="text-xl font-semibold">Candidate Application</h2>
        <button onClick={onClose} className="text-gray-500 text-lg">✕</button>
      </div>

      <div className="p-6">
        <NewApplicationForm
          formData={application}
          setFormData={() => {}}
          readOnly={true}       // ❌ HR cannot edit
          setIsDirty={() => {}}
          isDirty={false}
          onSubmit={() => {}}
          onBack={() => onClose()}
        />
      </div>
    </motion.div>
  );
}