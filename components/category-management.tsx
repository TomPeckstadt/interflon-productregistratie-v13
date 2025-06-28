"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2 } from 'lucide-react'
import { saveCategory, deleteCategory, type Category } from "@/lib/supabase"

interface CategoryManagementProps {
  categories: Category[]
  onCategoryAdded: (category: Category) => void
  onCategoryDeleted: (id: string) => void
  setImportMessage: (message: string) => void
  setImportError: (error: string) => void
}

export function CategoryManagement({
  categories,
  onCategoryAdded,
  onCategoryDeleted,
  setImportMessage,
  setImportError,
}: CategoryManagementProps) {
  const [newCategory, setNewCategory] = useState({ name: "" })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      setImportError("Vul een categorienaam in")
      return
    }

    setIsLoading(true)

    try {
      const result = await saveCategory({ id: "", name: newCategory.name })

      if (result.data) {
        onCategoryAdded(result.data)
        setNewCategory({ name: "" })
        setIsAddDialogOpen(false)
        setImportMessage("✅ Categorie succesvol toegevoegd!")
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setImportError("Fout bij opslaan categorie")
      }
    } catch (error) {
      console.error("Error saving category:", error)
      setImportError("Fout bij opslaan categorie")
    }

    setIsLoading(false)
  }

  const handleDeleteCategory = async (id: string) => {
    setIsLoading(true)

    try {
      const { error } = await deleteCategory(id)

      if (!error) {
        onCategoryDeleted(id)
        setImportMessage("✅ Categorie succesvol verwijderd!")
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setImportError("Fout bij verwijderen categorie")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      setImportError("Fout bij verwijderen categorie")
    }

    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" /> Nieuwe Categorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Categorie Toevoegen</DialogTitle>
              <DialogDescription>Voeg een nieuwe productcategorie toe aan het systeem.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Categorienaam</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ name: e.target.value })}
                  placeholder="Voer categorienaam in"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleAddCategory} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                {isLoading ? "Bezig..." : "Categorie Toevoegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead className="w-[100px] text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                    Nog geen categorieën toegevoegd
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
