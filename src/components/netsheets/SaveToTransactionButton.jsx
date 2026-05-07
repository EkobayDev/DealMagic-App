import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, CheckCircle } from "lucide-react";

export default function SaveToTransactionButton({ netSheetType, vals }) {
  const [selectedTx, setSelectedTx] = useState("");
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () =>
      currentUser?.role === "admin"
        ? base44.entities.Transaction.list("-updated_date", 200)
        : base44.entities.Transaction.filter({ created_by: currentUser.email }, "-updated_date", 200),
    enabled: !!currentUser,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.TransactionDocument.create(data),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["tx-docs", selectedTx] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    const tx = transactions.find((t) => t.id === selectedTx);
    const label = netSheetType === "buyer" ? "Buyer Net Sheet" : "Seller Net Sheet";
    saveMutation.mutate({
      transaction_id: selectedTx,
      transaction_address: tx?.property_address || vals.address || "",
      doc_type: "net_sheet",
      name: `${label}${vals.address ? " — " + vals.address : ""}`,
      net_sheet_type: netSheetType,
      data: vals,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedTx} onValueChange={setSelectedTx}>
        <SelectTrigger className="h-9 w-56 text-sm">
          <SelectValue placeholder="Link to transaction..." />
        </SelectTrigger>
        <SelectContent>
          {transactions.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.property_address}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTx && (
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || saved}
          className="h-9 gap-2 bg-[#FFFF00] text-slate-900 hover:bg-[#e6e600] text-sm"
        >
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save to Transaction</>}
        </Button>
      )}
    </div>
  );
}