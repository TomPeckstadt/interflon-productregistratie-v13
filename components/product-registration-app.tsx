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
import ProfessionalQRCode from "@/components/professional-qr-code"

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

export default function ProductRegistrationApp() {
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
  const manualInputRef = useRef<HTMLInputElement>(null)

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

  // Auto-focus het QR scanner input veld wanneer de scanner opent
  useEffect(() => {
    if (showQrScanner && manualInputRef.current) {
      // Kleine delay om zeker te zijn dat de modal volledig geladen is
      setTimeout(() => {
        manualInputRef.current?.focus()
      }, 100)
    }
  }, [showQrScanner])

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

  // QR Code cleaning function voor draadloze scanners met keyboard layout problemen
  const cleanQrCode = (rawQrCode: string): string => {
    console.log("🧹 Cleaning QR code (AZERTY→QWERTY):", rawQrCode)

    // AZERTY naar QWERTY mapping (België/Frankrijk keyboard layout)
    const azertyToQwertyMap: Record<string, string> = {
      // Cijfer rij AZERTY → QWERTY
      "&": "1", // AZERTY 1 → QWERTY 1
      é: "2", // AZERTY 2 → QWERTY 2
      '"': "3", // AZERTY 3 → QWERTY 3
      "'": "4", // AZERTY 4 → QWERTY 4
      "(": "5", // AZERTY 5 → QWERTY 5
      "§": "6", // AZERTY 6 → QWERTY 6
      è: "7", // AZERTY 7 → QWERTY 7
      "!": "8", // AZERTY 8 → QWERTY 8
      ç: "9", // AZERTY 9 → QWERTY 9
      à: "0", // AZERTY 0 → QWERTY 0

      // Speciale karakters AZERTY → QWERTY
      "°": "_", // AZERTY _ → QWERTY _
      "-": "-", // Blijft hetzelfde
      "=": "=", // Blijft hetzelfde maar kan anders zijn

      // Letters die anders kunnen zijn
      a: "a",
      z: "z",
      e: "e",
      r: "r",
      t: "t",
      y: "y",
      u: "u",
      i: "i",
      o: "o",
      p: "p",
      q: "q",
      s: "s",
      d: "d",
      f: "f",
      g: "g",
      h: "h",
      j: "j",
      k: "k",
      l: "l",
      m: "m",
      w: "w",
      x: "x",
      c: "c",
      v: "v",
      b: "b",
      n: "n",

      // Hoofdletters
      A: "A",
      Z: "Z",
      E: "E",
      R: "R",
      T: "T",
      Y: "Y",
      U: "U",
      I: "I",
      O: "O",
      P: "P",
      Q: "Q",
      S: "S",
      D: "D",
      F: "F",
      G: "G",
      H: "H",
      J: "J",
      K: "K",
      L: "L",
      M: "M",
      W: "W",
      X: "X",
      C: "C",
      V: "V",
      B: "B",
      N: "N",
    }

    // Stap 1: Character-by-character mapping
    let cleaned = rawQrCode
      .split("")
      .map((char) => azertyToQwertyMap[char] || char)
      .join("")

    console.log("🔄 After AZERTY→QWERTY mapping:", cleaned)

    // Stap 2: Specifieke patronen voor jouw QR codes
    // Als we weten dat het patroon _581533 zou moeten zijn:
    const knownPatterns = [
      { wrong: '°(!&(""', correct: "_581533" },
      { wrong: "°(!&(", correct: "_5815" },
      // Voeg hier meer patronen toe als je ze tegenkomt
    ]

    for (const pattern of knownPatterns) {
      if (cleaned.includes(pattern.wrong)) {
        cleaned = cleaned.replace(pattern.wrong, pattern.correct)
        console.log(`🎯 Applied pattern fix: ${pattern.wrong} → ${pattern.correct}`)
      }
    }

    // Stap 3: Probeer exacte match met bestaande producten
    const exactMatch = products.find((p) => p.qrcode === cleaned)
    if (exactMatch) {
      console.log("✅ Found exact match after cleaning:", exactMatch.qrcode)
      return cleaned
    }

    // Stap 4: Fuzzy matching
    const fuzzyMatch = products.find(
      (p) =>
        p.qrcode &&
        (p.qrcode.replace(/[^A-Z0-9]/g, "") === cleaned.replace(/[^A-Z0-9]/g, "") ||
          cleaned.includes(p.qrcode.substring(0, 6)) ||
          p.qrcode.includes(cleaned.substring(0, 6))),
    )

    if (fuzzyMatch) {
      console.log("🎯 Found fuzzy match:", fuzzyMatch.qrcode)
      return fuzzyMatch.qrcode!
    }

    console.log("❌ No match found, returning cleaned version:", cleaned)
    return cleaned
  }

  const handleQrCodeDetected = (qrCode: string) => {
    console.log("📱 Raw QR code detected:", qrCode)

    // Clean de QR code voor draadloze scanner problemen
    const cleanedQrCode = cleanQrCode(qrCode)
    console.log("📱 Cleaned QR code:", cleanedQrCode)

    setQrScanResult(cleanedQrCode)

    if (qrScanMode === "registration") {
      // Zoek eerst met de gecleande code
      let foundProduct = products.find((p) => p.qrcode === cleanedQrCode)

      // Als niet gevonden, probeer ook de originele code
      if (!foundProduct) {
        foundProduct = products.find((p) => p.qrcode === qrCode)
      }

      // Als nog steeds niet gevonden, probeer fuzzy matching
      if (!foundProduct && cleanedQrCode.length > 5) {
        foundProduct = products.find(
          (p) =>
            p.qrcode &&
            (p.qrcode.toLowerCase().includes(cleanedQrCode.toLowerCase()) ||
              cleanedQrCode.toLowerCase().includes(p.qrcode.toLowerCase())),
        )
      }

      if (foundProduct) {
        setSelectedProduct(foundProduct.name)
        setProductSearchQuery(foundProduct.name)
        if (foundProduct.categoryId) {
          setSelectedCategory(foundProduct.categoryId)
        }
        setImportMessage(`✅ Product gevonden: ${foundProduct.name}`)
        setTimeout(() => setImportMessage(""), 3000)
      } else {
        setImportError(`❌ Geen product gevonden voor QR code: ${cleanedQrCode} (origineel: ${qrCode})`)
        setTimeout(() => setImportError(""), 5000)
      }
    } else if (qrScanMode === "product-management") {
      setNewProductQrCode(cleanedQrCode)
      setImportMessage(`✅ QR code gescand: ${cleanedQrCode}`)
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
      const attachmentUrl = URL.createObjectURL(file)
      const updateData = {
        name: product.name,
        qr_code: product.qrcode || null,
        category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
        attachment_url: attachmentUrl,
        attachment_name: file.name,
      }

      setImportMessage("📎 Bezig met uploaden...")
      const result = await updateProduct(product.id, updateData)

      if (result.error) {
        setImportError("Fout bij uploaden bijlage")
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
      const updateData = {
        name: product.name,
        qr_code: product.qrcode || null,
        category_id: product.categoryId ? Number.parseInt(product.categoryId) : null,
        attachment_url: null,
        attachment_name: null,
      }

      setImportMessage("🗑️ Bezig met verwijderen...")
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
                      <Label className="text-sm sm:text-base font-medium">📦 Product</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1" ref={productSelectorRef}>
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
                              className="h-10 sm:h-12 pr-8"
                              required
                            />
                            <ChevronDown
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer"
                              onClick={() => setShowProductDropdown(!showProductDropdown)}
                            />
                          </div>

                          {showProductDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {getFilteredProducts().length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500">Geen producten gevonden</div>
                              ) : (
                                getFilteredProducts().map((product) => (
                                  <div
                                    key={product.id}
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                    onClick={() => handleProductSelect(product)}
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    {product.qrcode && (
                                      <div className="text-xs text-gray-500">QR: {product.qrcode}</div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            setQrScanMode("registration")
                            startQrScanner()
                          }}
                          className="h-10 sm:h-12 px-4 bg-blue-600 hover:bg-blue-700"
                          disabled={showQrScanner}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Scan QR
                        </Button>
                      </div>
                      {qrScanResult && <p className="text-sm text-green-600">✅ QR Code gescand: {qrScanResult}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-medium">📍 Locatie</Label>
                      <Select value={location} onValueChange={setLocation} required>
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Selecteer een locatie" />
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
                          <SelectValue placeholder="Selecteer een doel" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purposeItem) => (
                            <SelectItem key={purposeItem} value={purposeItem}>
                              {purposeItem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 h-12 sm:h-14 text-base sm:text-lg font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? "Bezig met registreren..." : "💾 Product Registreren"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📋 Registratie Geschiedenis</CardTitle>
                <CardDescription>Bekijk alle product registraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Search and filter controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="history-search">Zoeken</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          id="history-search"
                          type="text"
                          placeholder="Zoek in registraties..."
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          className="pl-8"
                        />
                        {historySearchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-6 w-6 p-0"
                            onClick={() => setHistorySearchQuery("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="history-user-filter">Gebruiker</Label>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="history-location-filter">Locatie</Label>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sort-by">Sorteren op</Label>
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
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="date-from" className="text-sm">
                        Van:
                      </Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-auto"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="date-to" className="text-sm">
                        Tot:
                      </Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-auto"
                      />
                    </div>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nieuwste eerst</SelectItem>
                        <SelectItem value="oldest">Oudste eerst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-gray-600">
                    {getFilteredAndSortedRegistrations().length} van {registrations.length} registraties
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum & Tijd</TableHead>
                        <TableHead>Gebruiker</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Locatie</TableHead>
                        <TableHead>Doel</TableHead>
                        <TableHead>QR Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedRegistrations().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            {historySearchQuery ||
                            selectedHistoryUser !== "all" ||
                            selectedHistoryLocation !== "all" ||
                            dateFrom ||
                            dateTo
                              ? "Geen registraties gevonden met de huidige filters"
                              : "Nog geen registraties"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredAndSortedRegistrations().map((registration) => (
                          <TableRow key={registration.id}>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  {new Date(registration.timestamp).toLocaleDateString("nl-NL")}
                                </div>
                                <div className="text-gray-500">
                                  {new Date(registration.timestamp).toLocaleTimeString("nl-NL", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{registration.user}</TableCell>
                            <TableCell>{registration.product}</TableCell>
                            <TableCell>{registration.location}</TableCell>
                            <TableCell>{registration.purpose}</TableCell>
                            <TableCell>
                              {registration.qrcode ? (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                  {registration.qrcode}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">👥 Gebruikers Beheren</CardTitle>
                <CardDescription>Voeg nieuwe gebruikers toe of verwijder bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuwe gebruiker"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                    <Button onClick={addNewUser} className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-search" className="text-sm font-medium">
                      Zoek gebruiker
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="user-search"
                        type="text"
                        placeholder="Zoek op naam..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                      {userSearchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() => setUserSearchQuery("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    {getFilteredAndSortedUsers().length} van {users.length} gebruikers
                    {userSearchQuery && ` (gefilterd op "${userSearchQuery}")`}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAndSortedUsers().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                            {userSearchQuery
                              ? `Geen gebruikers gevonden voor "${userSearchQuery}"`
                              : "Geen gebruikers beschikbaar"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredAndSortedUsers().map((user) => (
                          <TableRow key={user}>
                            <TableCell>{user}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeUser(user)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
                                      <ProfessionalQRCode qrCode={product.qrcode} size={32} />
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
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🗂️ Categorieën Beheren</CardTitle>
                <CardDescription>Voeg nieuwe categorieën toe of bewerk bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuwe categorie"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <Button onClick={addNewCategory} className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
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
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditCategory(category)}
                                  className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeCategory(category)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">📍 Locaties Beheren</CardTitle>
                <CardDescription>Voeg nieuwe locaties toe of bewerk bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuwe locatie"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                    />
                    <Button onClick={addNewLocation} className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                            Nog geen locaties toegevoegd
                          </TableCell>
                        </TableRow>
                      ) : (
                        locations.map((location) => (
                          <TableRow key={location}>
                            <TableCell>{location}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditLocation(location)}
                                  className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeLocation(location)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purposes">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">🎯 Doelen Beheren</CardTitle>
                <CardDescription>Voeg nieuwe doelen toe of bewerk bestaande</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nieuw doel"
                      value={newPurposeName}
                      onChange={(e) => setNewPurposeName(e.target.value)}
                    />
                    <Button onClick={addNewPurpose} className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="mr-2 h-4 w-4" /> Toevoegen
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purposes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                            Nog geen doelen toegevoegd
                          </TableCell>
                        </TableRow>
                      ) : (
                        purposes.map((purpose) => (
                          <TableRow key={purpose}>
                            <TableCell>{purpose}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditPurpose(purpose)}
                                  className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removePurpose(purpose)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-gray-900">Totaal Registraties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900">{registrations.length}</div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-gray-900">Unieke Gebruikers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900">
                      {registrations.length > 0 ? new Set(registrations.map((r) => r.user)).size : users.length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-gray-900">Unieke Producten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900">
                      {registrations.length > 0 ? new Set(registrations.map((r) => r.product)).size : products.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              {registrations.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b pb-4">
                    <CardTitle className="text-lg font-medium text-gray-900">Recente Activiteit</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-600">Datum</TableHead>
                          <TableHead className="text-gray-600">Gebruiker</TableHead>
                          <TableHead className="text-gray-600">Product</TableHead>
                          <TableHead className="text-gray-600">Locatie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .slice(0, 6)
                          .map((registration) => (
                            <TableRow key={registration.id}>
                              <TableCell className="text-gray-900">
                                {new Date(registration.timestamp).toLocaleDateString("nl-NL", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-gray-900">{registration.user}</TableCell>
                              <TableCell className="text-gray-900">{registration.product}</TableCell>
                              <TableCell className="text-gray-900">{registration.location}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Top Users */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">Top Gebruikers</CardTitle>
                  <CardDescription className="text-gray-500">Gebruikers met de meeste registraties</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-600">Gebruiker</TableHead>
                        <TableHead className="text-gray-600">Registraties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTopUsers().map(([user, count]) => (
                        <TableRow key={user}>
                          <TableCell className="text-gray-900">{user}</TableCell>
                          <TableCell className="text-gray-900">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">Top Producten</CardTitle>
                  <CardDescription className="text-gray-500">Producten met de meeste registraties</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-600">Product</TableHead>
                        <TableHead className="text-gray-600">Registraties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTopProducts().map(([product, count]) => (
                        <TableRow key={product}>
                          <TableCell className="text-gray-900">{product}</TableCell>
                          <TableCell className="text-gray-900">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Top Locations */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">Top Locaties</CardTitle>
                  <CardDescription className="text-gray-500">Locaties met de meeste registraties</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-600">Locatie</TableHead>
                        <TableHead className="text-gray-600">Registraties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTopLocations().map(([location, count]) => (
                        <TableRow key={location}>
                          <TableCell className="text-gray-900">{location}</TableCell>
                          <TableCell className="text-gray-900">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialogs */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Product Bewerken</DialogTitle>
              <DialogDescription>Bewerk de product gegevens</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Naam
                </Label>
                <Input
                  id="name"
                  value={editingProduct?.name || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct!, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="qrcode" className="text-right">
                  QR Code
                </Label>
                <Input
                  id="qrcode"
                  value={editingProduct?.qrcode || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct!, qrcode: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Categorie
                </Label>
                <Select
                  value={editingProduct?.categoryId || "none"}
                  onValueChange={(value) => setEditingProduct({ ...editingProduct!, categoryId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecteer een categorie" />
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
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditDialog(false)}>
                Annuleren
              </Button>
              <Button type="button" onClick={handleSaveProduct}>
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gebruiker Bewerken</DialogTitle>
              <DialogDescription>Bewerk de gebruikersnaam</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Naam
                </Label>
                <Input
                  id="name"
                  value={editingUser || ""}
                  onChange={(e) => setEditingUser(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditUserDialog(false)}>
                Annuleren
              </Button>
              <Button type="button" onClick={handleSaveUser}>
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Categorie Bewerken</DialogTitle>
              <DialogDescription>Bewerk de categorienaam</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Naam
                </Label>
                <Input
                  id="name"
                  value={editingCategory?.name || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory!, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditCategoryDialog(false)}>
                Annuleren
              </Button>
              <Button type="button" onClick={handleSaveCategory}>
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Locatie Bewerken</DialogTitle>
              <DialogDescription>Bewerk de locatienaam</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Naam
                </Label>
                <Input
                  id="name"
                  value={editingLocation || ""}
                  onChange={(e) => setEditingLocation(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditLocationDialog(false)}>
                Annuleren
              </Button>
              <Button type="button" onClick={handleSaveLocation}>
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditPurposeDialog} onOpenChange={setShowEditPurposeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Doel Bewerken</DialogTitle>
              <DialogDescription>Bewerk de doelnaam</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Naam
                </Label>
                <Input
                  id="name"
                  value={editingPurpose || ""}
                  onChange={(e) => setEditingPurpose(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditPurposeDialog(false)}>
                Annuleren
              </Button>
              <Button type="button" onClick={handleSavePurpose}>
                Opslaan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Scanner */}
        {showQrScanner && (
          <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">QR Code Scanner</h2>
                <Button variant="ghost" size="sm" onClick={stopQrScanner} className="p-1">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center mb-6">
                <div className="text-6xl mb-4 text-gray-400">📱</div>
                <p className="text-gray-600 mb-4">Richt je camera op een QR code</p>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      ref={manualInputRef}
                      type="text"
                      placeholder="Of voer QR code handmatig in"
                      value={qrScanResult}
                      onChange={(e) => {
                        const newValue = e.target.value
                        setQrScanResult(newValue)

                        // Automatisch verwerken wanneer er een waarde is en Enter wordt gedrukt
                        // OF wanneer de waarde lijkt op een QR code (meer dan 3 karakters)
                        if (newValue.trim().length > 3) {
                          // Kleine delay om te voorkomen dat het te snel triggert tijdens typen
                          setTimeout(() => {
                            if (newValue === qrScanResult && newValue.trim()) {
                              handleQrCodeDetected(newValue.trim())
                            }
                          }, 500)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && qrScanResult.trim()) {
                          handleQrCodeDetected(qrScanResult.trim())
                        }
                      }}
                      className="w-full text-center"
                      autoFocus // Automatische focus!
                    />
                  </div>

                  <Button
                    onClick={() => {
                      if (qrScanResult.trim()) {
                        handleQrCodeDetected(qrScanResult.trim())
                      }
                    }}
                    disabled={!qrScanResult.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    QR Code Gebruiken
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
