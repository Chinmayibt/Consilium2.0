import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { generateConsiliumPrd, resolveConsiliumWorkspaceId } from "@/lib/api";
import { managerNavItems } from "@/pages/corporate/managerNav";

const ManagerRequirements = () => {
  const { workspaceId = "" } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [constraints, setConstraints] = useState("");

  const generatePrd = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const consiliumWorkspaceId = await resolveConsiliumWorkspaceId(token, workspaceId);
      await generateConsiliumPrd(token, consiliumWorkspaceId, {
        product_name: productName,
        product_description: productDescription,
        target_users: targetUsers,
        key_features: keyFeatures,
        competitors: competitors || undefined,
        constraints: constraints || undefined,
      });
      navigate(`/business/manager/workspaces/${workspaceId}/prd`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PRD");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={managerNavItems(workspaceId)} sidebarTitle="Manager" sidebarSubtitle="Business Dashboard">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Requirements Agent</h1>
          <p className="text-muted-foreground">Describe the product and generate a PMZero-style PRD.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Product Inputs</CardTitle>
            <CardDescription>These fields feed the requirements and planning agents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Product Description</Label>
              <Textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Users</Label>
                <Textarea value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Key Features</Label>
                <Textarea value={keyFeatures} onChange={(e) => setKeyFeatures(e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Competitors (optional)</Label>
                <Textarea value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Constraints (optional)</Label>
                <Textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => void generatePrd()} disabled={loading || !productName || !productDescription}>
              {loading ? "Generating..." : "Generate PRD"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerRequirements;
