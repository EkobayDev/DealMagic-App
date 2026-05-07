import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BuyerNetSheet from "../components/netsheets/BuyerNetSheet";
import SellerNetSheet from "../components/netsheets/SellerNetSheet";

export default function NetSheets() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Net Sheet Calculator</h1>
          <p className="text-sm text-slate-500 mt-1">Oklahoma buyer & seller estimates</p>
        </div>
        <img
          src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
          alt="DealMagic"
          className="h-40 w-auto object-contain ml-auto"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>

      <Tabs defaultValue="buyer" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="buyer" className="rounded-lg data-[state=active]:bg-[#FFFF00] data-[state=active]:text-slate-900 px-6">
            Buyer Net Sheet
          </TabsTrigger>
          <TabsTrigger value="seller" className="rounded-lg data-[state=active]:bg-[#FFFF00] data-[state=active]:text-slate-900 px-6">
            Seller Net Sheet
          </TabsTrigger>
        </TabsList>
        <TabsContent value="buyer" className="mt-6">
          <BuyerNetSheet />
        </TabsContent>
        <TabsContent value="seller" className="mt-6">
          <SellerNetSheet />
        </TabsContent>
      </Tabs>
    </div>
  );
}