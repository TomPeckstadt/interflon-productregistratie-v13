"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"

// Supabase imports
import {
  fetchUsers,
  fetchProducts,
  fetchLocations,
  fetchPurposes,
  fetchCategories,
  fetchRegistrations,
  saveUser,
  saveProduct,
  saveLocation,
  savePurpose,
  saveCategory,
  saveRegistration,
  deleteUser,
  deleteProduct,
  deleteLocation,
  deletePurpose,
  deleteCategory,
  subscribeToUsers,
  subscribeToProducts,
  subscribeToLocations,
  subscribeToPurposes,
  subscribeToCategories,
  subscribeToRegistrations,
  isSupabaseConfigured,
  updateUser,
  updateLocation,
  updatePurpose,
  updateProduct,
  updateCategory,
  testSupabaseConnection,
  uploadPDFToStorage,
  deletePDFFromStorage,
} from "@/lib/supabase"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, Search, X, QrCode, ChevronDown, Edit, Printer } from "lucide-react"
import { AuthGuard, useAuth } from "@/lib/auth-components"

interface Product {
  id: string
  name: string
  qrcode?: string
  categoryId?: string
  created_at?: string
  attachmentUrl?: string
  attachmentName?: string
}

interface Category {
  id: string
  name: string
}

interface Registration {
  id: string
  user: string
  product: string
  location: string
  purpose: string
  timestamp: string
  date: string
  time: string
  qrcode?: string
  created_at?: string
}

function ProductRegistrationApp() {
  // ALL HOOKS MUST BE AT THE TOP - NEVER CONDITIONAL
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string>("")

  // Basic state
  const [currentUser, setCurrentUser] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [location, setLocation] = useState("")
  const [purpose, setPurpose] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [importMessage, setImportMessage] = useState("")
  const [importError, setImportError] = useState("")

  // Connection state
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Controleren...")

  // Data arrays - SINGLE SOURCE OF TRUTH
  const [users, setUsers] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [purposes, setPurposes] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])

  // New item states
  const [newUserName, setNewUserName] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [newProductQrCode, setNewProductQrCode] = useState("")
  const [newProductCategory, setNewProductCategory] = useState("none")
  const [newLocationName, setNewLocationName] = useState("")
  const [newPurposeName, setNewPurposeName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [originalCategory, setOriginalCategory] = useState<Category | null>(null)
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false)

  const [editingUser, setEditingUser] = useState<string>("")
  const [originalUser, setOriginalUser] = useState<string>("")
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)

  const [editingLocation, setEditingLocation] = useState<string>("")
  const [originalLocation, setOriginalLocation] = useState<string>("")
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false)

  const [editingPurpose, setEditingPurpose] = useState<string>("")
  const [originalPurpose, setOriginalPurpose] = useState<string>("")
  const [showEditPurposeDialog, setShowEditPurposeDialog] = useState(false)

  // Product selector states
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productSelectorRef = useRef<HTMLDivElement>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")

  // QR Scanner states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [qrScanResult, setQrScanResult] = useState("")
  const [qrScanMode, setQrScanMode] = useState<"registration" | "product-management">("registration")

  // History filtering states
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [selectedHistoryUser, setSelectedHistoryUser] = useState("all")
  const [selectedHistoryLocation, setSelectedHistoryLocation] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("newest")

  // Product search state
  const [productSearchFilter, setProductSearchFilter] = useState("")

  // Load data on component mount
  useEffect(() => {
    console.log("🚀 Starting app initialization...")
    loadAllData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSelectorRef.current && !productSelectorRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Set default user when users are loaded
  useEffect(() => {
    if (!currentUser && users.length > 0) {
      setCurrentUser(users[0])
      console.log("👤 Set default user:", users[0])
    }
  }, [users, currentUser])

  const loadAllData = async () => {
    console.log("🔄 Loading all data...")
    setConnectionStatus("Verbinden met database...")

    try {
      const supabaseConfigured = isSupabaseConfigured()
      console.log("🔧 Supabase configured:", supabaseConfigured)

      if (supabaseConfigured) {
        console.log("🔄 Testing Supabase connection...")

        // Test connection first
        const connectionTest = await testSupabaseConnection()

        if (connectionTest) {
          console.log("🔄 Loading from Supabase...")
          const [usersResult, productsResult, locationsResult, purposesResult, categoriesResult, registrationsResult] =
            await Promise.all([
              fetchUsers(),
              fetchProducts(),
              fetchLocations(),
              fetchPurposes(),
              fetchCategories(),
              fetchRegistrations(),
            ])

          console.log("📊 Supabase results:", {
            users: { success: !usersResult.error, count: usersResult.data?.length || 0 },
            products: { success: !productsResult.error, count: productsResult.data?.length || 0 },
            locations: { success: !locationsResult.error, count: locationsResult.data?.length || 0 },
            purposes: { success: !locationsResult.error, count: locationsResult.data?.length || 0 },
            categories: { success: !categoriesResult.error, count: categoriesResult.data?.length || 0 },
          })

          // Check if we have successful connection
          const hasErrors = usersResult.error || productsResult.error || categoriesResult.error

          if (!hasErrors) {
            console.log("✅ Supabase connected successfully")
            setIsSupabaseConnected(true)
            setConnectionStatus("Supabase verbonden")

            // Set data from Supabase
            setUsers(usersResult.data || [])
            setProducts(productsResult.data || [])
            setLocations(locationsResult.data || [])
            setPurposes(purposesResult.data || [])
            setCategories(categoriesResult.data || [])
            setRegistrations(registrationsResult.data || [])

            // Set up real-time subscriptions
            setupSubscriptions()
          } else {
            console.log("️ Supabase data fetch failed - using mock data")
            setIsSupabaseConnected(false)
            setConnectionStatus("Mock data actief (data fetch failed)")
            loadMockData()
          }
        } else {
          console.log("⚠️ Supabase connection test failed - using mock data")
          setIsSupabaseConnected(false)
          setConnectionStatus("Mock data actief (connection failed)")
          loadMockData()
        }
      } else {
        console.log("⚠️ Supabase not configured - using mock data")
        setIsSupabaseConnected(false)
        setConnectionStatus("Mock data actief (not configured)")
        loadMockData()
      }

      console.log("🎯 App initialization complete - setting ready state")
      setIsReady(true)
    } catch (error) {
      console.error("❌ Error loading data:", error)
      setError(`Fout bij laden: ${error}`)
      setIsSupabaseConnected(false)
      setConnectionStatus("Mock data actief (error)")
      loadMockData()
      setIsReady(true) // Still show the app with mock data
    }
  }

  const loadMockData = () => {
    console.log("📱 Loading mock data...")
    const mockUsers = [
      "Tom Peckstadt",
      "Sven De Poorter",
      "Nele Herteleer",
      "Wim Peckstadt",
      "Siegfried Weverbergh",
      "Jan Janssen",
    ]
    const mockProducts = [
      { id: "1", name: "Interflon Metal Clean spray 500ml", qrcode: "IFLS001", categoryId: "1" },
      { id: "2", name: "Interflon Grease LT2 Lube shuttle 400gr", qrcode: "IFFL002", categoryId: "1" },
      { id: "3", name: "Interflon Maintenance Kit", qrcode: "IFD003", categoryId: "2" },
      { id: "4", name: "Interflon Food Lube spray 500ml", qrcode: "IFGR004", categoryId: "1" },
      { id: "5", name: "Interflon Foam Cleaner spray 500ml", qrcode: "IFMC005", categoryId: "2" },
      { id: "6", name: "Interflon Fin Super", qrcode: "IFMK006", categoryId: "3" },
    ]
    const mockLocations = [
      "Warehouse Dematic groot boven",
      "Warehouse Interflon",
      "Warehouse Dematic klein beneden",
      "Onderhoud werkplaats",
      "Kantoor 1.1",
    ]
    const mockPurposes = ["Presentatie", "Thuiswerken", "Reparatie", "Training", "Demonstratie"]
    const mockCategories = [
      { id: "1", name: "Smeermiddelen" },
      { id: "2", name: "Reinigers" },
      { id: "3", name: "Onderhoud" },
    ]

    // Mock registrations with realistic data
    const mockRegistrations = [
      {
        id: "1",
        user: "Tom Peckstadt",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Interflon",
        purpose: "Reparatie",
        timestamp: "2025-06-15T05:41:00Z",
        date: "2025-06-15",
        time: "05:41",
        qrcode: "IFLS001",
      },
      {
        id: "2",
        user: "Nele Herteleer",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Dematic klein beneden",
        purpose: "Training",
        timestamp: "2025-06-15T05:48:00Z",
        date: "2025-06-15",
        time: "05:48",
        qrcode: "IFLS001",
      },
      {
        id: "3",
        user: "Tom Peckstadt",
        product: "Interflon Grease LT2 Lube shuttle 400gr",
        location: "Warehouse Dematic groot boven",
        purpose: "Reparatie",
        timestamp: "2025-06-15T12:53:00Z",
        date: "2025-06-15",
        time: "12:53",
        qrcode: "IFFL002",
      },
      {
        id: "4",
        user: "Tom Peckstadt",
        product: "Interflon Grease LT2 Lube shuttle 400gr",
        location: "Warehouse Dematic groot boven",
        purpose: "Demonstratie",
        timestamp: "2025-06-16T20:32:00Z",
        date: "2025-06-16",
        time: "20:32",
        qrcode: "IFFL002",
      },
      {
        id: "5",
        user: "Sven De Poorter",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Dematic groot boven",
        purpose: "Presentatie",
        timestamp: "2025-06-16T21:07:00Z",
        date: "2025-06-16",
        time: "21:07",
        qrcode: "IFLS001",
      },
      {
        id: "6",
        user: "Tom Peckstadt",
        product: "Interflon Maintenance Kit",
        location: "Onderhoud werkplaats",
        purpose: "Reparatie",
        timestamp: "2025-06-14T10:15:00Z",
        date: "2025-06-14",
        time: "10:15",
        qrcode: "IFD003",
      },
      {
        id: "7",
        user: "Siegfried Weverbergh",
        product: "Interflon Food Lube spray 500ml",
        location: "Warehouse Interflon",
        purpose: "Training",
        timestamp: "2025-06-14T14:22:00Z",
        date: "2025-06-14",
        time: "14:22",
        qrcode: "IFGR004",
      },
      {
        id: "8",
        user: "Wim Peckstadt",
        product: "Interflon Foam Cleaner spray 500ml",
        location: "Warehouse Dematic klein beneden",
        purpose: "Demonstratie",
        timestamp: "2025-06-13T09:30:00Z",
        date: "2025-06-13",
        time: "09:30",
        qrcode: "IFMC005",
      },
      {
        id: "9",
        user: "Sven De Poorter",
        product: "Interflon Maintenance Kit",
        location: "Onderhoud werkplaats",
        purpose: "Reparatie",
        timestamp: "2025-06-13T16:45:00Z",
        date: "2025-06-13",
        time: "16:45",
        qrcode: "IFD003",
      },
      {
        id: "10",
        user: "Tom Peckstadt",
        product: "Interflon Metal Clean spray 500ml",
        location: "Warehouse Dematic groot boven",
        purpose: "Presentatie",
        timestamp: "2025-06-12T11:20:00Z",
        date: "2025-06-12",
        time: "11:20",
        qrcode: "IFLS001",
      },
      {
        id: "11",
        user: "Siegfried Weverbergh",
        product: "Interflon Grease LT2 Lube shuttle 400gr",
        location: "Warehouse Interflon",
        purpose: "Training",
        timestamp: "2025-06-12T15:10:00Z",
        date: "2025-06-12",
        time: "15:10",
        qrcode: "IFFL002",
      },
      {
        id: "12",
        user: "Siegfried Weverbergh",
        product: "Interflon Food Lube spray 500ml",
        location: "Warehouse Dematic klein beneden",
        purpose: "Demonstratie",
        timestamp: "2025-06-11T08:55:00Z",
        date: "2025-06-11",
        time: "08:55",
        qrcode: "IFGR004",
      },
      {
        id: "13",
        user: "Tom Peckstadt",
        product: "Interflon Grease LT2 Lube shuttle 400gr",
        location: "Warehouse Dematic groot boven",
        purpose: "Reparatie",
        timestamp: "2025-06-10T13:40:00Z",
        date: "2025-06-10",
        time: "13:40",
        qrcode: "IFFL002",
      },
    ]

    setUsers(mockUsers)
    setProducts(mockProducts)
    setLocations(mockLocations)
    setPurposes(mockPurposes)
    setCategories(mockCategories)
    setRegistrations(mockRegistrations)
  }

  const setupSubscriptions = () => {
    console.log("🔔 Setting up real-time subscriptions...")

    const usersSub = subscribeToUsers((newUsers) => {
      console.log("🔔 Users updated via subscription:", newUsers.length)
      setUsers(newUsers)
    })

    const productsSub = subscribeToProducts((newProducts) => {
      console.log("🔔 Products updated via subscription:", newProducts.length)
      setProducts(newProducts)
    })

    const locationsSub = subscribeToLocations((newLocations) => {
      console.log("🔔 Locations updated via subscription:", newLocations.length)
      setLocations(newLocations)
    })

    const purposesSub = subscribeToPurposes((newPurposes) => {
      console.log("🔔 Purposes updated via subscription:", newPurposes.length)
      setPurposes(newPurposes)
    })

    const categoriesSub = subscribeToCategories((newCategories) => {
      console.log("🔔 Categories updated via subscription:", newCategories.length)
      setCategories(newCategories)
    })

    const registrationsSub = subscribeToRegistrations((newRegistrations) => {
      console.log("🔔 Registrations updated via subscription:", newRegistrations.length)
      setRegistrations(newRegistrations)
    })

    // Cleanup subscriptions on unmount
    return () => {
      usersSub?.unsubscribe?.()
      productsSub?.unsubscribe?.()
      locationsSub?.unsubscribe?.()
      purposesSub?.unsubscribe?.()
      categoriesSub?.unsubscribe?.()
      registrationsSub?.unsubscribe?.()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser || !selectedProduct || !location || !purpose) {
      return
    }

    setIsLoading(true)

    try {
      const now = new Date()
      const product = products.find((p) => p.name === selectedProduct)

      const registrationData = {
        user_name: currentUser,
        product_name: selectedProduct,
        location,
        purpose,
        timestamp: now.toISOString(),
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().split(" ")[0],
        qr_code: product?.qrcode,
      }

      const result = await saveRegistration(registrationData)
      if (result.error) {
        console.error("Error saving registration:", result.error)
        setImportError("Fout bij opslaan registratie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        console.log("✅ Registration saved")
        // FORCE LOCAL STATE UPDATE
        console.log("🔄 Forcing local registrations refresh...")
        const refreshResult = await fetchRegistrations()
        if (refreshResult.data) {
          console.log("🔄 Updating local registrations state...")
          setRegistrations(refreshResult.data)
        }
        setImportMessage("✅ Product geregistreerd!")
        setTimeout(() => setImportMessage(""), 2000)
      }

      // Reset form
      setSelectedProduct("")
      setProductSearchQuery("")
      setSelectedCategory("all")
      setLocation("")
      setPurpose("")
      setQrScanResult("")

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving registration:", error)
      setImportError("Fout bij opslaan registratie")
      setTimeout(() => setImportError(""), 3000)
    }

    setIsLoading(false)
  }

  // QR Scanner functions
  const startQrScanner = () => {
    setShowQrScanner(true)
  }

  const stopQrScanner = () => {
    setShowQrScanner(false)
  }

  const handleQrCodeDetected = (qrCode: string) => {
    setQrScanResult(qrCode)

    if (qrScanMode === "registration") {
      const foundProduct = products.find((p) => p.qrcode === qrCode)

      if (foundProduct) {
        setSelectedProduct(foundProduct.name)
        setProductSearchQuery(foundProduct.name)
        if (foundProduct.categoryId) {
          setSelectedCategory(foundProduct.categoryId)
        }
        setImportMessage(`✅ Product gevonden: ${foundProduct.name}`)
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setImportError(`❌ Geen product gevonden voor QR code: ${qrCode}`)
        setTimeout(() => setImportError(""), 3000)
      }
    } else if (qrScanMode === "product-management") {
      setNewProductQrCode(qrCode)
      setImportMessage(`✅ QR code gescand: ${qrCode}`)
      setTimeout(() => setImportMessage(""), 3000)
    }

    stopQrScanner()
  }

  // Get filtered products for dropdown
  const getFilteredProducts = () => {
    const filtered = products
      .filter((product) => {
        if (selectedCategory === "all") return true
        return product.categoryId === selectedCategory
      })
      .filter(
        (product) =>
          product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
          (product.qrcode && product.qrcode.toLowerCase().includes(productSearchQuery.toLowerCase())),
      )

    return filtered
  }

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product.name)
    setProductSearchQuery(product.name)
    setShowProductDropdown(false)
  }

  // Edit handlers
  const handleEditProduct = (product: Product) => {
    console.log("🔧 Starting product edit:", product)
    setOriginalProduct({ ...product })
    setEditingProduct({ ...product })
    setShowEditDialog(true)
  }

  const handleEditUser = (user: string) => {
    console.log("🔧 Starting user edit:", user)
    setOriginalUser(user)
    setEditingUser(user)
    setShowEditUserDialog(true)
  }

  const handleEditCategory = (category: Category) => {
    console.log("🔧 Starting category edit:", category)
    setOriginalCategory({ ...category })
    setEditingCategory({ ...category })
    setShowEditCategoryDialog(true)
  }

  const handleEditLocation = (location: string) => {
    console.log("🔧 Starting location edit:", location)
    setOriginalLocation(location)
    setEditingLocation(location)
    setShowEditLocationDialog(true)
  }

  const handleEditPurpose = (purpose: string) => {
    console.log("🔧 Starting purpose edit:", purpose)
    setOriginalPurpose(purpose)
    setEditingPurpose(purpose)
    setShowEditPurposeDialog(true)
  }

  // Save handlers
  const handleSaveProduct = async () => {
    if (!editingProduct || !originalProduct) return

    const hasChanges =
      editingProduct.name !== originalProduct.name ||
      editingProduct.qrcode !== originalProduct.qrcode ||
      editingProduct.categoryId !== originalProduct.categoryId

    if (!hasChanges) {
      setShowEditDialog(false)
      return
    }

    console.log("💾 Saving product changes:", { original: originalProduct, edited: editingProduct })

    const updateData = {
      name: editingProduct.name,
      qr_code: editingProduct.qrcode || null,
      category_id: editingProduct.categoryId ? Number.parseInt(editingProduct.categoryId) : null,
      // Behoud de bestaande attachment gegevens
      attachment_url: originalProduct.attachmentUrl || null,
      attachment_name: originalProduct.attachmentName || null,
    }

    const result = await updateProduct(originalProduct.id, updateData)

    if (result.error) {
      console.error("❌ Error updating product:", result.error)
      setImportError("Fout bij bijwerken product")
      setTimeout(() => setImportError(""), 3000)
    } else {
      console.log("✅ Product updated successfully")
      setImportMessage("✅ Product bijgewerkt!")
      setTimeout(() => setImportMessage(""), 2000)

      // FORCE LOCAL STATE UPDATE
      console.log("🔄 Forcing local products refresh...")
      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        console.log("🔄 Updating local products state...")
        setProducts(refreshResult.data)
      }
    }

    setShowEditDialog(false)
  }

  const handleSaveUser = async () => {
    if (!editingUser.trim() || !originalUser) return

    const hasChanges = editingUser.trim() !== originalUser
    if (!hasChanges) {
      setShowEditUserDialog(false)
      return
    }

    console.log("💾 Saving user changes:", { original: originalUser, edited: editingUser.trim() })

    const result = await updateUser(originalUser, editingUser.trim())

    if (result.error) {
      console.error("❌ Error updating user:", result.error)
      setImportError("Fout bij bijwerken gebruiker")
      setTimeout(() => setImportError(""), 3000)
    } else {
      console.log("✅ User updated successfully")
      setImportMessage("✅ Gebruiker bijgewerkt!")
      setTimeout(() => setImportMessage(""), 2000)

      // FORCE LOCAL STATE UPDATE
      console.log("🔄 Forcing local users refresh...")
      const refreshResult = await fetchUsers()
      if (refreshResult.data) {
        console.log("🔄 Updating local users state...")
        setUsers(refreshResult.data)
      }
    }

    setShowEditUserDialog(false)
  }

  const handleSaveCategory = async () => {
    if (!editingCategory || !originalCategory) return

    const hasChanges = editingCategory.name.trim() !== originalCategory.name
    if (!hasChanges) {
      setShowEditCategoryDialog(false)
      return
    }

    console.log("💾 Saving category changes:", { original: originalCategory, edited: editingCategory })

    const result = await updateCategory(originalCategory.id, { name: editingCategory.name.trim() })

    if (result.error) {
      console.error("❌ Error updating category:", result.error)
      setImportError("Fout bij bijwerken categorie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      console.log("✅ Category updated successfully")
      setImportMessage("✅ Categorie bijgewerkt!")
      setTimeout(() => setImportMessage(""), 2000)

      // FORCE LOCAL STATE UPDATE
      console.log("🔄 Forcing local categories refresh...")
      const refreshResult = await fetchCategories()
      if (refreshResult.data) {
        console.log("🔄 Updating local categories state...")
        setCategories(refreshResult.data)
      }
    }

    setShowEditCategoryDialog(false)
  }

  const handleSaveLocation = async () => {
    if (!editingLocation.trim() || !originalLocation) return

    const hasChanges = editingLocation.trim() !== originalLocation
    if (!hasChanges) {
      setShowEditLocationDialog(false)
      return
    }

    console.log("💾 Saving location changes:", { original: originalLocation, edited: editingLocation.trim() })

    const result = await updateLocation(originalLocation, editingLocation.trim())

    if (result.error) {
      console.error("❌ Error updating location:", result.error)
      setImportError("Fout bij bijwerken locatie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      console.log("✅ Location updated successfully")
      setImportMessage("✅ Locatie bijgewerkt!")
      setTimeout(() => setImportMessage(""), 2000)

      // FORCE LOCAL STATE UPDATE
      console.log("🔄 Forcing local locations refresh...")
      const refreshResult = await fetchLocations()
      if (refreshResult.data) {
        console.log("🔄 Updating local locations state...")
        setLocations(refreshResult.data)
      }
    }

    setShowEditLocationDialog(false)
  }

  const handleSavePurpose = async () => {
    if (!editingPurpose.trim() || !originalPurpose) return

    const hasChanges = editingPurpose.trim() !== originalPurpose
    if (!hasChanges) {
      setShowEditPurposeDialog(false)
      return
    }

    console.log("💾 Saving purpose changes:", { original: originalPurpose, edited: editingPurpose.trim() })

    const result = await updatePurpose(originalPurpose, editingPurpose.trim())

    if (result.error) {
      console.error("❌ Error updating purpose:", result.error)
      setImportError("Fout bij bijwerken doel")
      setTimeout(() => setImportError(""), 3000)
    } else {
      console.log("✅ Purpose updated successfully")
      setImportMessage("✅ Doel bijgewerkt!")
      setTimeout(() => setImportMessage(""), 2000)

      // FORCE LOCAL STATE UPDATE
      console.log("🔄 Forcing local purposes refresh...")
      const refreshResult = await fetchPurposes()
      if (refreshResult.data) {
        console.log("🔄 Updating local purposes state...")
        setPurposes(refreshResult.data)
      }
    }

    setShowEditPurposeDialog(false)
  }

  // Attachment handlers
  const handleAttachmentUpload = async (product: Product, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setImportError("Alleen PDF bestanden zijn toegestaan")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setImportError("Bestand is te groot (max 10MB)")
      setTimeout(() => setImportError(""), 3000)
      return
    }

    try {
      setImportMessage("📎 Bezig met uploaden...")

      // Upload to Supabase Storage
      const { url: storageUrl, error: uploadError } = await uploadPDFToStorage(file, product.id)

      if (uploadError || !storageUrl) {
        setImportError("Fout bij uploaden bijlage")
        setTimeout(() => setImportError(""), 3000)
        return
      }

      // Update product with storage URL
      const updateData = {
        name: product.name,
        qr_code: product.qrcode || null,
        category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
        attachment_url: storageUrl,
        attachment_name: file.name,
      }

      const result = await updateProduct(product.id, updateData)

      if (result.error) {
        setImportError("Fout bij bijwerken product")
        setTimeout(() => setImportError(""), 3000)
      } else {
        setImportMessage("✅ Bijlage toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)

        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
      }
    } catch (error) {
      setImportError("Fout bij uploaden bijlage")
      setTimeout(() => setImportError(""), 3000)
    }

    event.target.value = ""
  }

  const handleRemoveAttachment = async (product: Product) => {
    try {
      setImportMessage("🗑️ Bezig met verwijderen...")

      // Delete from storage if it's a storage URL
      if (product.attachmentUrl) {
        await deletePDFFromStorage(product.attachmentUrl)
      }

      // Update product to remove attachment
      const updateData = {
        name: product.name,
        qr_code: product.qrcode || null,
        category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
        attachment_url: null,
        attachment_name: null,
      }

      const result = await updateProduct(product.id, updateData)

      if (result.error) {
        setImportError("Fout bij verwijderen bijlage")
        setTimeout(() => setImportError(""), 3000)
      } else {
        setImportMessage("✅ Bijlage verwijderd!")
        setTimeout(() => setImportMessage(""), 2000)

        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
      }
    } catch (error) {
      setImportError("Fout bij verwijderen bijlage")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  const generateQRCode = async (product: Product) => {
    try {
      // Genereer een unieke QR code voor het product
      const timestamp = Date.now()
      const productCode = product.name.replace(/\s+/g, "").substring(0, 10).toUpperCase()
      const uniqueQRCode = `${productCode}_${timestamp.toString().slice(-6)}`

      const updateData = {
        name: product.name,
        qr_code: uniqueQRCode,
        category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
        attachment_url: product.attachmentUrl || null,
        attachment_name: product.attachmentName || null,
      }

      setImportMessage("📱 Bezig met QR-code genereren...")
      const result = await updateProduct(product.id, updateData)

      if (result.error) {
        setImportError("Fout bij genereren QR-code")
        setTimeout(() => setImportError(""), 3000)
      } else {
        setImportMessage(`✅ QR-code gegenereerd: ${uniqueQRCode}`)
        setTimeout(() => setImportMessage(""), 3000)

        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          setProducts(refreshResult.data)
        }
      }
    } catch (error) {
      setImportError("Fout bij genereren QR-code")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // PROFESSIONELE QR-CODE GENERATIE met externe API
  const generateRealQRCode = (text: string): string => {
    // Gebruik QR Server API voor professionele QR-codes
    const size = 200
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&ecc=M`
    return apiUrl
  }

  // Print QR code function
  const printQRCode = async (product: Product) => {
    if (!product.qrcode) return

    try {
      const qrImageUrl = generateRealQRCode(product.qrcode)

      // Create a new window for printing
      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${product.name}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .qr-container {
              display: inline-block;
              border: 2px solid #000;
              padding: 10px;
              margin: 10px;
              background: white;
            }
            .qr-code {
              width: 150px;
              height: 150px;
              margin-bottom: 10px;
            }
            .product-name {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 5px;
              word-wrap: break-word;
              max-width: 150px;
            }
            .qr-text {
              font-size: 10px;
              font-family: monospace;
              color: #666;
            }
            @media print {
              body { margin: 0; padding: 5px; }
              .qr-container { 
                page-break-inside: avoid;
                margin: 5px;
                padding: 5px;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="product-name">${product.name}</div>
            <img src="${qrImageUrl}" alt="QR Code" class="qr-code" />
            <div class="qr-text">${product.qrcode}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </body>
      </html>
    `)
      printWindow.document.close()
    } catch (error) {
      console.error("Error generating QR code for printing:", error)
      setImportError("Fout bij genereren QR-code voor afdrukken")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // Print all QR codes function - optimized for label printers
  const printAllQRCodes = async () => {
    try {
      // Filter products that have QR codes
      const productsWithQR = products.filter((product) => product.qrcode)

      if (productsWithQR.length === 0) {
        setImportError("Geen producten met QR codes gevonden")
        setTimeout(() => setImportError(""), 3000)
        return
      }

      setImportMessage(`📱 Bezig met voorbereiden van ${productsWithQR.length} QR codes voor afdrukken...`)

      // Create a new window for printing all QR codes
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        setImportError("Kon print venster niet openen")
        setTimeout(() => setImportError(""), 3000)
        return
      }

      // Generate QR code URLs for all products
      const qrCodeData = productsWithQR.map((product) => ({
        product,
        qrImageUrl: generateRealQRCode(product.qrcode!),
      }))

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Alle QR Codes - ${productsWithQR.length} labels</title>
            <style>
              body {
                margin: 0;
                padding: 10px;
                font-family: Arial, sans-serif;
                background: white;
              }
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 5px;
                width: 100%;
              }
              .qr-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                border: 1px solid #000;
                padding: 8px;
                background: white;
                page-break-inside: avoid;
                width: 170px;
                height: 220px;
                justify-content: space-between;
              }
              .product-name {
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                word-wrap: break-word;
                line-height: 1.2;
                max-height: 36px;
                overflow: hidden;
                margin-bottom: 5px;
              }
              .qr-code {
                width: 120px;
                height: 120px;
                margin: 5px 0;
              }
              .qr-text {
                font-size: 8px;
                font-family: monospace;
                color: #333;
                text-align: center;
                margin-top: 5px;
              }
              .category-text {
                font-size: 7px;
                color: #666;
                text-align: center;
                margin-top: 2px;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 5px; 
                }
                .qr-grid {
                  gap: 2px;
                }
                .qr-container { 
                  page-break-inside: avoid;
                  margin: 2px;
                  padding: 5px;
                  width: 160px;
                  height: 200px;
                }
                .qr-code {
                  width: 100px;
                  height: 100px;
                }
              }
              @page {
                margin: 10mm;
                size: A4;
              }
            </style>
          </head>
          <body>
            <div class="qr-grid">
              ${qrCodeData
                .map(({ product, qrImageUrl }) => {
                  const categoryName = product.categoryId
                    ? categories.find((c) => c.id === product.categoryId)?.name || ""
                    : ""

                  return `
                  <div class="qr-container">
                    <div class="product-name">${product.name}</div>
                    <img src="${qrImageUrl}" alt="QR Code" class="qr-code" />
                    <div class="qr-text">${product.qrcode}</div>
                    ${categoryName ? `<div class="category-text">${categoryName}</div>` : ""}
                  </div>
                `
                })
                .join("")}
            </div>
            <script>
              let imagesLoaded = 0;
              const totalImages = ${productsWithQR.length};
              
              // Wait for all images to load before printing
              const images = document.querySelectorAll('.qr-code');
              
              function checkAllImagesLoaded() {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                      window.close();
                    }, 1000);
                  }, 500);
                }
              }
              
              images.forEach(img => {
                if (img.complete) {
                  checkAllImagesLoaded();
                } else {
                  img.onload = checkAllImagesLoaded;
                  img.onerror = checkAllImagesLoaded;
                }
              });
              
              // Fallback: print after 5 seconds regardless
              setTimeout(() => {
                if (imagesLoaded < totalImages) {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 1000);
                }, 5000);
              });
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()

      setImportMessage(`✅ ${productsWithQR.length} QR codes klaargezet voor afdrukken!`)
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("Error generating all QR codes for printing:", error)
      setImportError("Fout bij genereren QR codes voor afdrukken")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // Export QR codes to Excel/CSV for label printers
  const exportQRCodesForLabelPrinter = async () => {
    try {
      // Filter products that have QR codes
      const productsWithQR = products.filter((product) => product.qrcode)

      if (productsWithQR.length === 0) {
        setImportError("Geen producten met QR codes gevonden")
        setTimeout(() => setImportError(""), 3000)
        return
      }

      setImportMessage(`📊 Bezig met exporteren van ${productsWithQR.length} QR codes voor labelprinter...`)

      // Create comprehensive CSV content for label printers
      const csvContent = [
        // Header row with all necessary fields for label printer software
        [
          "ProductNaam",
          "QRCode",
          "Categorie",
          "QRCodeURL",
          "ProductID",
          "CreatedDate",
          "LabelText1",
          "LabelText2",
          "LabelText3",
        ],
        // Data rows
        ...productsWithQR.map((product) => {
          const categoryName = product.categoryId ? categories.find((c) => c.id === product.categoryId)?.name || "" : ""

          const qrImageUrl = generateRealQRCode(product.qrcode!)
          const createdDate = product.created_at
            ? new Date(product.created_at).toLocaleDateString("nl-NL")
            : new Date().toLocaleDateString("nl-NL")

          return [
            product.name, // ProductNaam
            product.qrcode, // QRCode (text)
            categoryName, // Categorie
            qrImageUrl, // QRCodeURL (for image import)
            product.id, // ProductID
            createdDate, // CreatedDate
            product.name, // LabelText1 (duplicate for flexibility)
            product.qrcode, // LabelText2 (QR code text)
            categoryName, // LabelText3 (category)
          ]
        }),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")

      // Generate filename with current date and count
      const now = new Date()
      const dateStr = now.toISOString().split("T")[0]
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "")
      const filename = `QR_Labels_Export_${dateStr}_${timeStr}_${productsWithQR.length}items.csv`

      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(link.href)

      setImportMessage(
        `✅ Labelprinter export voltooid! ${productsWithQR.length} QR codes geëxporteerd naar ${filename}`,
      )
      setTimeout(() => setImportMessage(""), 5000)

      // Also create a detailed instruction file
      await createLabelPrinterInstructions(filename, productsWithQR.length)
    } catch (error) {
      console.error("Error exporting QR codes for label printer:", error)
      setImportError("Fout bij exporteren QR codes voor labelprinter")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // Create instruction file for label printer setup
  const createLabelPrinterInstructions = async (csvFilename: string, itemCount: number) => {
    const instructions = `LABELPRINTER INSTRUCTIES
========================

Bestand: ${csvFilename}
Aantal items: ${itemCount}
Gegenereerd: ${new Date().toLocaleString("nl-NL")}

KOLOM UITLEG:
=============
- ProductNaam: Volledige productnaam
- QRCode: QR code tekst/nummer  
- Categorie: Product categorie
- QRCodeURL: Link naar QR code afbeelding (120x120px)
- ProductID: Uniek product ID
- CreatedDate: Aanmaakdatum
- LabelText1: Extra tekstveld (productnaam)
- LabelText2: Extra tekstveld (QR code)
- LabelText3: Extra tekstveld (categorie)

LABELPRINTER SOFTWARE SETUP:
============================

ALTEC ATP-300 PRO:
1. Open Altec Label Designer software
2. Ga naar File → Import Data → CSV
3. Selecteer ${csvFilename}
4. Map de velden:
   - Tekst 1: ProductNaam
   - Tekst 2: Categorie  
   - QR Code: QRCode (tekst) of QRCodeURL (afbeelding)
   - Barcode: QRCode
5. Stel label afmetingen in (bijv. 25x15mm, 40x20mm)
6. Test print 1 label voordat je batch print
7. Voor QR afbeeldingen: gebruik QRCodeURL veld

BROTHER P-TOUCH EDITOR:
1. Open P-touch Editor
2. Ga naar File → Import
3. Selecteer ${csvFilename}
4. Kies "ProductNaam" voor hoofdtekst
5. Kies "QRCodeURL" voor QR code afbeelding
6. Kies "Categorie" voor subtekst

DYMO CONNECT:
1. Open Dymo Connect
2. Kies label template
3. Ga naar Import Data
4. Selecteer ${csvFilename}
5. Map velden naar label elementen

ZEBRA ZEBRADESIGNER:
1. Open ZebraDesigner
2. Create New Label
3. Database → Connect to Database
4. Selecteer CSV file: ${csvFilename}
5. Drag fields naar label design

ALGEMENE TIPS:
==============
- QR code afbeeldingen worden automatisch gedownload via URL
- Voor Altec ATP-300 Pro: gebruik 200x200px QR codes voor beste kwaliteit
- Test eerst met 1-2 labels voordat je alles print
- Bewaar dit bestand samen met de CSV voor referentie
- Bij problemen: controleer of CSV correct wordt geïmporteerd

LABEL AFMETINGEN SUGGESTIES:
===========================
Voor Altec ATP-300 Pro:
- Klein: 25mm x 15mm (alleen QR code + kort ID)
- Medium: 40mm x 20mm (QR + productnaam verkort)
- Groot: 50mm x 30mm (QR + volledige naam + categorie)
- Extra groot: 62mm x 29mm (QR + naam + categorie + ID)

ALTEC ATP-300 PRO SPECIFIEKE TIPS:
==================================
- Gebruik TrueType fonts voor beste leesbaarheid
- QR code minimaal 8mm x 8mm voor betrouwbare scan
- Stel print snelheid in op 'Medium' voor beste kwaliteit
- Gebruik 'High Quality' mode voor QR codes
- Test verschillende label materialen (papier/synthetisch)
- Kalibreer printer regelmatig voor juiste positionering

TROUBLESHOOTING ALTEC ATP-300 PRO:
==================================
- CSV niet geïmporteerd? → Controleer encoding (UTF-8)
- QR codes niet zichtbaar? → Gebruik QRCode tekstveld ipv URL
- Labels scheef? → Kalibreer printer via instellingen
- Slechte kwaliteit? → Verhoog print kwaliteit en verlaag snelheid

Voor vragen: bewaar dit instructiebestand!
`

    try {
      const instructionBlob = new Blob([instructions], { type: "text/plain;charset=utf-8;" })
      const instructionLink = document.createElement("a")
      const instructionFilename = `QR_Labels_Instructies_${new Date().toISOString().split("T")[0]}.txt`

      instructionLink.href = URL.createObjectURL(instructionBlob)
      instructionLink.download = instructionFilename
      instructionLink.style.display = "none"

      document.body.appendChild(instructionLink)
      instructionLink.click()
      document.body.removeChild(instructionLink)

      URL.revokeObjectURL(instructionLink.href)
    } catch (error) {
      console.log("Could not create instruction file, but CSV export was successful")
    }
  }

  // Excel Import/Export functions - Browser compatible version
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImportMessage("📥 Bezig met importeren...")

      const text = await file.text()
      const lines = text.split("\n")

      let importedCount = 0
      let skippedCount = 0

      // Skip header row and process data
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue // Skip empty lines

        const columns = line.split("\t") // Tab-separated or comma-separated
        if (columns.length === 1) {
          // Try comma separation if tab didn't work
          columns.splice(0, 1, ...line.split(","))
        }

        const productName = columns[0]?.trim().replace(/"/g, "")
        const categoryName = columns[1]?.trim().replace(/"/g, "") || ""

        if (!productName) continue

        // Check if product already exists
        const existingProduct = products.find((p) => p.name.toLowerCase() === productName.toLowerCase())

        if (existingProduct) {
          skippedCount++
          continue
        }

        // Find category ID
        let categoryId: string | undefined = undefined
        if (categoryName) {
          const category = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
          categoryId = category?.id
        }

        // Create new product
        const newProduct: Product = {
          id: Date.now().toString() + i,
          name: productName,
          categoryId: categoryId,
          created_at: new Date().toISOString(),
        }

        const result = await saveProduct(newProduct)
        if (!result.error) {
          importedCount++
        }
      }

      // Refresh products list
      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }

      setImportMessage(`✅ Import voltooid! ${importedCount} producten toegevoegd, ${skippedCount} overgeslagen.`)
      setTimeout(() => setImportMessage(""), 5000)
    } catch (error) {
      console.error("Error importing file:", error)
      setImportError("Fout bij importeren bestand")
      setTimeout(() => setImportError(""), 3000)
    }

    // Reset file input
    event.target.value = ""
  }

  const handleExportExcel = async () => {
    try {
      setImportMessage("📤 Bezig met exporteren...")

      // Create CSV content
      const csvContent = [
        ["Productnaam", "Categorie"], // Header row
        ...products.map((product) => [
          product.name,
          product.categoryId ? categories.find((c) => c.id === product.categoryId)?.name || "" : "",
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")

      // Generate filename with current date
      const now = new Date()
      const dateStr = now.toISOString().split("T")[0]
      const filename = `producten_export_${dateStr}.csv`

      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(link.href)

      setImportMessage(`✅ Export voltooid! ${products.length} producten geëxporteerd naar CSV.`)
      setTimeout(() => setImportMessage(""), 3000)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      setImportError("Fout bij exporteren naar CSV")
      setTimeout(() => setImportError(""), 3000)
    }
  }

  // Add functions
  const addNewUser = async () => {
    if (newUserName.trim() && !users.includes(newUserName.trim())) {
      const userName = newUserName.trim()
      const result = await saveUser(userName)
      if (result.error) {
        setImportError("Fout bij opslaan gebruiker")
        setTimeout(() => setImportError(""), 3000)
      } else {
        // FORCE LOCAL STATE UPDATE - TOEGEVOEGD
        console.log("🔄 Forcing local users refresh...")
        const refreshResult = await fetchUsers()
        if (refreshResult.data) {
          console.log("🔄 Updating local users state...")
          setUsers(refreshResult.data)
        }
        setImportMessage("✅ Gebruiker toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewUserName("")
    }
  }

  const addNewProduct = async () => {
    if (newProductName.trim()) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: newProductName.trim(),
        qrcode: newProductQrCode.trim() || undefined,
        categoryId: newProductCategory === "none" ? undefined : newProductCategory,
        created_at: new Date().toISOString(),
      }

      const result = await saveProduct(newProduct)
      if (result.error) {
        setImportError("Fout bij opslaan product")
        setTimeout(() => setImportError(""), 3000)
      } else {
        // FORCE LOCAL STATE UPDATE - TOEGEVOEGD
        console.log("🔄 Forcing local products refresh...")
        const refreshResult = await fetchProducts()
        if (refreshResult.data) {
          console.log("🔄 Updating local products state...")
          setProducts(refreshResult.data)
        }
        setImportMessage("✅ Product toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }

      setNewProductName("")
      setNewProductQrCode("")
      setNewProductCategory("none")
    }
  }

  const addNewLocation = async () => {
    if (newLocationName.trim() && !locations.includes(newLocationName.trim())) {
      const locationName = newLocationName.trim()
      const result = await saveLocation(locationName)
      if (result.error) {
        setImportError("Fout bij opslaan locatie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        // FORCE LOCAL STATE UPDATE - TOEGEVOEGD
        console.log("🔄 Forcing local locations refresh...")
        const refreshResult = await fetchLocations()
        if (refreshResult.data) {
          console.log("🔄 Updating local locations state...")
          setLocations(refreshResult.data)
        }
        setImportMessage("✅ Locatie toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewLocationName("")
    }
  }

  const addNewPurpose = async () => {
    if (newPurposeName.trim() && !purposes.includes(newPurposeName.trim())) {
      const purposeName = newPurposeName.trim()
      const result = await savePurpose(purposeName)
      if (result.error) {
        setImportError("Fout bij opslaan doel")
        setTimeout(() => setImportError(""), 3000)
      } else {
        // FORCE LOCAL STATE UPDATE - TOEGEVOEGD
        console.log("🔄 Forcing local purposes refresh...")
        const refreshResult = await fetchPurposes()
        if (refreshResult.data) {
          console.log("🔄 Updating local purposes state...")
          setPurposes(refreshResult.data)
        }
        setImportMessage("✅ Doel toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewPurposeName("")
    }
  }

  const addNewCategory = async () => {
    if (newCategoryName.trim() && !categories.find((c) => c.name === newCategoryName.trim())) {
      const categoryName = newCategoryName.trim()
      const result = await saveCategory({ name: categoryName })
      if (result.error) {
        setImportError("Fout bij opslaan categorie")
        setTimeout(() => setImportError(""), 3000)
      } else {
        // FORCE LOCAL STATE UPDATE - TOEGEVOEGD
        console.log("🔄 Forcing local categories refresh...")
        const refreshResult = await fetchCategories()
        if (refreshResult.data) {
          console.log("🔄 Updating local categories state...")
          setCategories(refreshResult.data)
        }
        setImportMessage("✅ Categorie toegevoegd!")
        setTimeout(() => setImportMessage(""), 2000)
      }
      setNewCategoryName("")
    }
  }

  // Remove functions
  const removeUser = async (userToRemove: string) => {
    const result = await deleteUser(userToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen gebruiker")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchUsers()
      if (refreshResult.data) {
        setUsers(refreshResult.data)
      }
      setImportMessage("✅ Gebruiker verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeProduct = async (productToRemove: Product) => {
    const result = await deleteProduct(productToRemove.id)
    if (result.error) {
      setImportError("Fout bij verwijderen product")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchProducts()
      if (refreshResult.data) {
        setProducts(refreshResult.data)
      }
      setImportMessage("✅ Product verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeLocation = async (locationToRemove: string) => {
    const result = await deleteLocation(locationToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen locatie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchLocations()
      if (refreshResult.data) {
        setLocations(refreshResult.data)
      }
      setImportMessage("✅ Locatie verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removePurpose = async (purposeToRemove: string) => {
    const result = await deletePurpose(purposeToRemove)
    if (result.error) {
      setImportError("Fout bij verwijderen doel")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchPurposes()
      if (refreshResult.data) {
        setPurposes(refreshResult.data)
      }
      setImportMessage("✅ Doel verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  const removeCategory = async (categoryToRemove: Category) => {
    const result = await deleteCategory(categoryToRemove.id)
    if (result.error) {
      setImportError("Fout bij verwijderen categorie")
      setTimeout(() => setImportError(""), 3000)
    } else {
      const refreshResult = await fetchCategories()
      if (refreshResult.data) {
        setCategories(refreshResult.data)
      }
      setImportMessage("✅ Categorie verwijderd!")
      setTimeout(() => setImportMessage(""), 2000)
    }
  }

  // Function to get filtered and sorted registrations
  const getFilteredAndSortedRegistrations = () => {
    const filtered = registrations.filter((registration) => {
      // Search filter
      if (historySearchQuery) {
        const searchLower = historySearchQuery.toLowerCase()
        const matchesSearch =
          registration.user.toLowerCase().includes(searchLower) ||
          registration.product.toLowerCase().includes(searchLower) ||
          registration.location.toLowerCase().includes(searchLower) ||
          registration.purpose.toLowerCase().includes(searchLower) ||
          (registration.qrcode && registration.qrcode.toLowerCase().includes(searchLower))

        if (!matchesSearch) return false
      }

      // User filter
      if (selectedHistoryUser !== "all" && registration.user !== selectedHistoryUser) {
        return false
      }

      // Location filter
      if (selectedHistoryLocation !== "all" && registration.location !== selectedHistoryLocation) {
        return false
      }

      // Date range filter
      const registrationDate = new Date(registration.timestamp).toISOString().split("T")[0]

      if (dateFrom && registrationDate < dateFrom) {
        return false
      }

      if (dateTo && registrationDate > dateTo) {
        return false
      }

      return true
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case "user":
          comparison = a.user.localeCompare(b.user, "nl", { sensitivity: "base" })
          break
        case "product":
          comparison = a.product.localeCompare(b.product, "nl", { sensitivity: "base" })
          break
        case "location":
          comparison = a.location.localeCompare(b.location, "nl", { sensitivity: "base" })
          break
        default:
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      }

      return sortOrder === "newest" ? -comparison : comparison
    })

    return filtered
  }

  // Function to get filtered and sorted users
  const getFilteredAndSortedUsers = () => {
    return users
      .filter((user) => user.toLowerCase().includes(userSearchQuery.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "nl", { sensitivity: "base" }))
  }

  // Statistics functions
  const getTopUsers = () => {
    const userCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.user] = (acc[reg.user] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getTopProducts = () => {
    const productCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.product] = (acc[reg.product] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getTopLocations = () => {
    const locationCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.location] = (acc[reg.location] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getProductChartData = () => {
    const productCounts = registrations.reduce(
      (acc, reg) => {
        acc[reg.product] = (acc[reg.product] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"]

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product, count], index) => ({
        product,
        count,
        color: colors[index % colors.length],
      }))
  }

  // CONDITIONAL RENDERING AFTER ALL HOOKS
  console.log("🎨 Rendering main app interface")

  // Show loading screen
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">App wordt geladen...</p>
          <p className="text-xs text-gray-500">{connectionStatus}</p>
        </div>
      </div>
    )
  }

  // Show error if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-red-500 text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900">Er ging iets mis</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Opnieuw Proberen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div
                  className="flex items-center bg-white p-4 rounded-lg shadow-sm border"
                  style={{ minWidth: "200px", height: "80px", position: "relative" }}
                >
                  <div className="w-1 h-12 bg-amber-500 absolute left-4"></div>
                  <div
                    className="text-2xl font-bold text-gray-800 tracking-wide absolute"
                    style={{ bottom: "16px", left: "32px" }}
                  >
                    DEMATIC
                  </div>
                </div>
              </div>

              <div className="hidden lg:block w-px h-16 bg-gray-300"></div>

              <div className="text-center lg:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Product Registratie</h1>
                <p className="text-sm lg:text-base text-gray-600 mt-1">Registreer product gebruik en locatie</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isSupabaseConnected ? "bg-green-500" : "bg-orange-500"}`}
                  ></div>
                  <span>{connectionStatus}</span>
                </div>
                <div className="hidden md:block">{registrations.length} registraties</div>
              </div>

              {/* User info and logout */}
              <UserInfo />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">✅ Product succesvol geregistreerd!</AlertDescription>
          </Alert>
        )}

        {importMessage && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">{importMessage}</AlertDescription>
          </Alert>
        )}

        {importError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{importError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="register" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 bg-white border border-gray-200 shadow-sm">
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Registreren
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              Geschiedenis ({registrations.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              Gebruikers ({users.length})
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Producten ({products.length})
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Categorieën ({categories.length})
            </TabsTrigger>
            <TabsTrigger
              value="locations"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Locaties ({locations.length})
            </TabsTrigger>
            <TabsTrigger
              value="purposes"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Doelen ({purposes.length})
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700"
            >
              Statistieken
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📦 Nieuw Product Registreren</CardTitle>
                <CardDescription>Scan een QR code of vul onderstaande gegevens handmatig in</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">👤 Gebruiker</Label>
                      <Select value={currentUser} onValueChange={setCurrentUser} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer gebruiker" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user} value={user}>
                              {user}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">🗂️ Categorie</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer een categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle categorieën</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm sm:text-base font-medium">📦 Product</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQrScanMode("registration")
                            startQrScanner()
                          }}
                          className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                          <QrCode className="h-4 w-4" />
                          QR Scannen
                        </Button>
                      </div>

                      <div className="relative" ref={productSelectorRef}>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Zoek product..."
                            value={productSearchQuery}
                            onChange={(e) => {
                              setProductSearchQuery(e.target.value)
                              setShowProductDropdown(true)
                            }}
                            onFocus={() => setShowProductDropdown(true)}
                            className="h-10 sm:h-12 pr-10"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        {showProductDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {getFilteredProducts().length > 0 ? (
                              getFilteredProducts().map((product) => (
                                <div
                                  key={product.id}
                                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => handleProductSelect(product)}
                                >
                                  <div className="font-medium text-sm">{product.name}</div>
                                  {product.qrcode && (
                                    <div className="text-xs text-gray-500 mt-1">QR: {product.qrcode}</div>
                                  )}
                                  {product.categoryId && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {categories.find((c) => c.id === product.categoryId)?.name}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">Geen producten gevonden</div>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedProduct && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div classNameclassName="text-sm font-medium text-green-800">
                            ✅ Geselecteerd: {selectedProduct}
                          </div>
                          {qrScanResult && <div className="text-xs text-green-600 mt-1">QR Code: {qrScanResult}</div>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">📍 Locatie</Label>
                      <Select value={location} onValueChange={setLocation} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer locatie" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc} value={loc}>
                              {loc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">🎯 Doel</Label>
                      <Select value={purpose} onValueChange={setPurpose} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer doel" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purp) => (
                            <SelectItem key={purp} value={purp}>
                              {purp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-amber-600 hover:bg-amber-700"
                    disabled={isLoading || !currentUser || !selectedProduct || !location || !purpose}
                  >
                    {isLoading ? "Bezig met opslaan..." : "📝 Product Registreren"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📋 Registratie Geschiedenis</CardTitle>
                <CardDescription>Overzicht van alle product registraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Zoeken..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={selectedHistoryUser} onValueChange={setSelectedHistoryUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle gebruikers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle gebruikers</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedHistoryLocation} onValueChange={setSelectedHistoryLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle locaties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle locaties</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    placeholder="Van datum"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />

                  <Input
                    type="date"
                    placeholder="Tot datum"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Datum</SelectItem>
                        <SelectItem value="user">Gebruiker</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="location">Locatie</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nieuwste eerst</SelectItem>
                        <SelectItem value="oldest">Oudste eerst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear filters button */}
                {(historySearchQuery ||
                  selectedHistoryUser !== "all" ||
                  selectedHistoryLocation !== "all" ||
                  dateFrom ||
                  dateTo) && (
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHistorySearchQuery("")
                        setSelectedHistoryUser("all")
                        setSelectedHistoryLocation("all")
                        setDateFrom("")
                        setDateTo("")
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Filters wissen
                    </Button>
                  </div>
                )}

                {/* Results count */}
                <div className="mb-4 text-sm text-gray-600">
                  {getFilteredAndSortedRegistrations().length} van {registrations.length} registraties
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Tijd</TableHead>
                        <TableHead>Gebruiker</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Locatie</TableHead>
                        <TableHead>Doel</TableHead>
                        <TableHead>QR Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedRegistrations().map((registration) => (
                        <TableRow key={registration.id}>
                          <TableCell>{registration.date}</TableCell>
                          <TableCell>{registration.time}</TableCell>
                          <TableCell className="font-medium">{registration.user}</TableCell>
                          <TableCell>{registration.product}</TableCell>
                          <TableCell>{registration.location}</TableCell>
                          <TableCell>{registration.purpose}</TableCell>
                          <TableCell>
                            {registration.qrcode && (
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {registration.qrcode}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {getFilteredAndSortedRegistrations().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>Geen registraties gevonden</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">👥 Gebruikers Beheer</CardTitle>
                <CardDescription>Beheer gebruikers die producten kunnen registreren</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Nieuwe gebruiker naam"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNewUser()}
                      />
                    </div>
                    <Button onClick={addNewUser} disabled={!newUserName.trim()} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Toevoegen
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-4 mb-4">
                      <Label className="text-sm font-medium">Zoeken:</Label>
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Zoek gebruikers..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {getFilteredAndSortedUsers().map((user) => (
                        <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <span className="font-medium">{user}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                              className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeUser(user)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {getFilteredAndSortedUsers().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">👤</div>
                        <p>Geen gebruikers gevonden</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📦 Producten Beheren</CardTitle>
                <CardDescription>Voeg nieuwe producten toe of bewerk bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      type="text"
                      placeholder="Product naam"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="QR Code (optioneel)"
                        value={newProductQrCode}
                        onChange={(e) => setNewProductQrCode(e.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          setQrScanMode("product-management")
                          startQrScanner()
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={showQrScanner}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen categorie</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addNewProduct} className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="mr-2 h-4 w-4" /> Toevoegen
                      </Button>
                    </div>
                  </div>

                  {/* Import/Export Section */}
                  <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-2 block">📊 Import/Export Producten</Label>
                      <div className="flex gap-2">
                        <div>
                          <input
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleImportExcel}
                            className="hidden"
                            id="excel-import"
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById("excel-import")?.click()}
                            className="flex items-center gap-2"
                          >
                            📥 Import CSV
                          </Button>
                        </div>
                        <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2">
                          📤 Export CSV
                        </Button>
                        <Button
                          variant="outline"
                          onClick={printAllQRCodes}
                          className="flex items-center gap-2 bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                        >
                          <Printer className="h-4 w-4" />
                          Print Alle QR Codes ({products.filter((p) => p.qrcode).length})
                        </Button>
                        <Button
                          variant="outline"
                          onClick={exportQRCodesForLabelPrinter}
                          className="flex items-center gap-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                        >
                          🏷️ Export voor Labelprinter ({products.filter((p) => p.qrcode).length})
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 flex-1">
                      <p className="mb-1">
                        <strong>CSV formaat:</strong>
                      </p>
                      <p>• Kolom A: Productnaam</p>
                      <p>• Kolom B: Categorie</p>
                      <p className="mt-1 text-gray-500">
                        Import voegt nieuwe producten toe. Bestaande producten worden overgeslagen.
                      </p>
                      <p className="mt-2 text-green-600 text-xs">
                        <strong>QR Codes:</strong> Print alle QR codes tegelijk voor labelprinter gebruik.
                      </p>
                      <p className="mt-1 text-blue-600 text-xs">
                        <strong>Labelprinter:</strong> Export QR codes naar Excel/CSV voor Brother, Dymo, Zebra
                        printers.
                      </p>
                    </div>
                  </div>

                  {/* Search functionality */}
                  <div className="space-y-2">
                    <Label htmlFor="product-search" className="text-sm font-medium">
                      Zoek product
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="product-search"
                        type="text"
                        placeholder="Zoek op naam, QR code of categorie..."
                        value={productSearchFilter}
                        onChange={(e) => setProductSearchFilter(e.target.value)}
                        className="pl-8"
                      />
                      {productSearchFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() => setProductSearchFilter("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    {(() => {
                      const filteredProducts = products.filter((product) => {
                        if (!productSearchFilter) return true
                        const searchLower = productSearchFilter.toLowerCase()
                        const categoryName = product.categoryId
                          ? categories.find((c) => c.id === product.categoryId)?.name || ""
                          : ""

                        return (
                          product.name.toLowerCase().includes(searchLower) ||
                          (product.qrcode && product.qrcode.toLowerCase().includes(searchLower)) ||
                          categoryName.toLowerCase().includes(searchLower)
                        )
                      })

                      return `${filteredProducts.length} van ${products.length} producten${
                        productSearchFilter ? ` (gefilterd op "${productSearchFilter}")` : ""
                      }`
                    })()}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>QR Code</TableHead>
                        <TableHead>Bijlage</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const filteredProducts = products.filter((product) => {
                          if (!productSearchFilter) return true
                          const searchLower = productSearchFilter.toLowerCase()
                          const categoryName = product.categoryId
                            ? categories.find((c) => c.id === product.categoryId)?.name || ""
                            : ""

                          return (
                            product.name.toLowerCase().includes(searchLower) ||
                            (product.qrcode && product.qrcode.toLowerCase().includes(searchLower)) ||
                            categoryName.toLowerCase().includes(searchLower)
                          )
                        })

                        if (filteredProducts.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                {productSearchFilter
                                  ? `Geen producten gevonden voor "${productSearchFilter}"`
                                  : "Nog geen producten toegevoegd"}
                              </TableCell>
                            </TableRow>
                          )
                        }

                        return filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              {product.categoryId
                                ? categories.find((c) => c.id === product.categoryId)?.name || "Onbekende categorie"
                                : "Geen categorie"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {product.qrcode ? (
                                  <>
                                    <div
                                      className="cursor-pointer"
                                      onClick={() => printQRCode(product)}
                                      title="Klik om af te drukken"
                                    >
                                      {/* <ProfessionalQRCode qrCode={product.qrcode} size={32} /> */}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                        {product.qrcode}
                                      </span>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => printQRCode(product)}
                                          className="text-xs bg-green-50 text-green-600 border-green-200 hover:bg-green-100 h-6 px-2"
                                        >
                                          <Printer className="h-3 w-3 mr-1" />
                                          Print
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => generateQRCode(product)}
                                          className="text-xs h-6 px-2"
                                        >
                                          🔄
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateQRCode(product)}
                                    className="text-xs"
                                  >
                                    📱 Genereer QR
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {product.attachmentUrl ? (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={product.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                      📎 {product.attachmentName || "Bijlage"}
                                    </a>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveAttachment(product)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => handleAttachmentUpload(product, e)}
                                      className="hidden"
                                      id={`file-${product.id}`}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById(`file-${product.id}`)?.click()}
                                      className="text-xs"
                                    >
                                      📎 PDF toevoegen
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditProduct(product)}
                                  className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeProduct(product)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🗂️ Categorieën Beheer</CardTitle>
                <CardDescription>Beheer product categorieën voor betere organisatie</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Nieuwe categorie naam"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNewCategory()}
                      />
                    </div>
                    <Button
                      onClick={addNewCategory}
                      disabled={!newCategoryName.trim()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Toevoegen
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <span className="font-medium">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                            className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCategory(category)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🗂️</div>
                      <p>Geen categorieën gevonden</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📍 Locaties Beheer</CardTitle>
                <CardDescription>Beheer beschikbare locaties voor product registratie</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Nieuwe locatie naam"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNewLocation()}
                      />
                    </div>
                    <Button
                      onClick={addNewLocation}
                      disabled={!newLocationName.trim()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Toevoegen
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {locations.map((location) => (
                      <div
                        key={location}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <span className="font-medium">{location}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditLocation(location)}
                            className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLocation(location)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {locations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📍</div>
                      <p>Geen locaties gevonden</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purposes">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🎯 Doelen Beheer</CardTitle>
                <CardDescription>Beheer beschikbare doelen voor product registratie</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Nieuw doel naam"
                        value={newPurposeName}
                        onChange={(e) => setNewPurposeName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNewPurpose()}
                      />
                    </div>
                    <Button
                      onClick={addNewPurpose}
                      disabled={!newPurposeName.trim()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Toevoegen
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {purposes.map((purpose) => (
                      <div key={purpose} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <span className="font-medium">{purpose}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditPurpose(purpose)}
                            className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePurpose(purpose)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {purposes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🎯</div>
                      <p>Geen doelen gevonden</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <div className="space-y-6">
              {/* Header */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">📊 Statistieken</CardTitle>
                  <CardDescription>Overzicht van product registraties</CardDescription>
                </CardHeader>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-gray-900 mb-2">Totaal Registraties</div>
                    <div className="text-4xl font-bold text-blue-600">{registrations.length}</div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-gray-900 mb-2">Unieke Gebruikers</div>
                    <div className="text-4xl font-bold text-green-600">
                      {new Set(registrations.map((r) => r.user)).size}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-gray-900 mb-2">Unieke Producten</div>
                    <div className="text-4xl font-bold text-purple-600">
                      {new Set(registrations.map((r) => r.product)).size}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-xl">Recente Activiteit</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Gebruiker</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Locatie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .slice(0, 10)
                          .map((registration) => (
                            <TableRow key={registration.id}>
                              <TableCell>
                                {new Date(registration.timestamp).toLocaleDateString("nl-NL")}
                                {new Date(registration.timestamp).toLocaleTimeString("nl-NL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </TableCell>
                              <TableCell className="font-medium">{registration.user}</TableCell>
                              <TableCell>{registration.product}</TableCell>
                              <TableCell>{registration.location}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Top 5 Gebruikers */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg">Top 5 Gebruikers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                        <div>Gebruiker</div>
                        <div className="text-right">Aantal</div>
                      </div>
                      {getTopUsers().map(([user, count]) => (
                        <div key={user} className="grid grid-cols-2 gap-4 text-sm">
                          <div className="font-medium">{user}</div>
                          <div className="text-right font-bold">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 5 Producten */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg">Top 5 Producten</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                        <div>Product</div>
                        <div className="text-right">Aantal</div>
                      </div>
                      {getTopProducts().map(([product, count]) => (
                        <div key={product} className="grid grid-cols-2 gap-4 text-sm">
                          <div className="font-medium">{product}</div>
                          <div className="text-right font-bold">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 5 Locaties */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg">Top 5 Locaties</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                        <div>Locatie</div>
                        <div className="text-right">Aantal</div>
                      </div>
                      {getTopLocations().map(([location, count]) => (
                        <div key={location} className="grid grid-cols-2 gap-4 text-sm">
                          <div className="font-medium">{location}</div>
                          <div className="text-right font-bold">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 5 Producten Pie Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg">Top 5 Producten</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Simple Pie Chart */}
                      <div className="flex justify-center">
                        <div className="relative w-32 h-32">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            {(() => {
                              const chartData = getProductChartData()
                              const total = chartData.reduce((sum, item) => sum + item.count, 0)
                              let currentAngle = 0

                              return chartData.map((item, index) => {
                                const percentage = (item.count / total) * 100
                                const angle = (percentage / 100) * 360
                                const startAngle = currentAngle
                                const endAngle = currentAngle + angle

                                const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                                const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                                const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)
                                const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)

                                const largeArcFlag = angle > 180 ? 1 : 0

                                const pathData = [
                                  `M 50 50`,
                                  `L ${x1} ${y1}`,
                                  `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                  "Z",
                                ].join(" ")

                                currentAngle += angle

                                return (
                                  <path key={index} d={pathData} fill={item.color} stroke="white" strokeWidth="1" />
                                )
                              })
                            })()}
                          </svg>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-2">
                        {getProductChartData().map((item, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <div className="flex-1 truncate" title={item.product}>
                              {item.product}
                            </div>
                            <div className="font-bold">{item.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* QR Scanner Modal */}
        {showQrScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">QR Code Scanner</h3>
                <Button variant="outline" size="sm" onClick={stopQrScanner}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Richt je camera op een QR code</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Of voer QR code handmatig in"
                      value={qrScanResult}
                      onChange={(e) => setQrScanResult(e.target.value)}
                    />
                    <Button
                      onClick={() => handleQrCodeDetected(qrScanResult)}
                      disabled={!qrScanResult.trim()}
                      className="w-full"
                    >
                      QR Code Gebruiken
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Product Bewerken</DialogTitle>
              <DialogDescription>Wijzig de product gegevens</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-4">
                <div>
                  <Label>Product Naam</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>QR Code</Label>
                  <Input
                    value={editingProduct.qrcode || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, qrcode: e.target.value })}
                    placeholder="Optioneel"
                  />
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Select
                    value={editingProduct.categoryId || "none"}
                    onValueChange={(value) =>
                      setEditingProduct({ ...editingProduct, categoryId: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen categorie</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleSaveProduct}>Opslaan</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gebruiker Bewerken</DialogTitle>
              <DialogDescription>Wijzig de gebruiker naam</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Gebruiker Naam</Label>
                <Input value={editingUser} onChange={(e) => setEditingUser(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSaveUser}>Opslaan</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Categorie Bewerken</DialogTitle>
              <DialogDescription>Wijzig de categorie naam</DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4">
                <div>
                  <Label>Categorie Naam</Label>
                  <Input
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEditCategoryDialog(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleSaveCategory}>Opslaan</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Location Dialog */}
        <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Locatie Bewerken</DialogTitle>
              <DialogDescription>Wijzig de locatie naam</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Locatie Naam</Label>
                <Input value={editingLocation} onChange={(e) => setEditingLocation(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditLocationDialog(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSaveLocation}>Opslaan</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Purpose Dialog */}
        <Dialog open={showEditPurposeDialog} onOpenChange={setShowEditPurposeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Doel Bewerken</DialogTitle>
              <DialogDescription>Wijzig het doel</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Doel</Label>
                <Input value={editingPurpose} onChange={(e) => setEditingPurpose(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditPurposeDialog(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSavePurpose}>Opslaan</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// UserInfo component
function UserInfo() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-sm font-medium text-gray-900">{user.email}</div>
        <div className="text-xs text-gray-500">Ingelogd</div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={signOut}
        className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
      >
        Uitloggen
      </Button>
    </div>
  )
}

export default function Page() {
  return (
    <AuthGuard>
      <ProductRegistrationApp />
    </AuthGuard>
  )
}
