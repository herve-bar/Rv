import React, { useState, useEffect } from 'react'

const LS_PRODUITS = 'comptoir:produits'
const LS_FACTURES = 'comptoir:factures'
const LS_NUM = 'comptoir:factureNum'

// 🔐 Mots de passe : change-les ici si besoin
const MOT_DE_PASSE_APP = 'rv2026'        // pour ouvrir l'application
const MOT_DE_PASSE_PAGES = 'marge2026'   // pour accéder à Recette et Marge

const LS_SESSION_APP = 'comptoir:sessionApp'
const LS_SESSION_PAGES = 'comptoir:sessionPages'
const PAGES_PROTEGEES = ['recette', 'marge']

function chargerProduits() {
  const raw = localStorage.getItem(LS_PRODUITS)
  if (raw) return JSON.parse(raw)
  return [
    { id: 1, nom: 'Riz (sac 25kg)', lotTaille: 25, lotPrix: 15000, prixVente: 750, stock: 100, stockAlerte: 20 },
    { id: 2, nom: 'Huile (bidon 20L)', lotTaille: 20, lotPrix: 24000, prixVente: 1500, stock: 40, stockAlerte: 10 },
  ]
}

function chargerFactures() {
  const raw = localStorage.getItem(LS_FACTURES)
  return raw ? JSON.parse(raw) : []
}

function chargerNum() {
  const raw = localStorage.getItem(LS_NUM)
  return raw ? parseInt(raw, 10) : 1
}

function prixAchatUnitaire(p) {
  return p.lotTaille > 0 ? p.lotPrix / p.lotTaille : 0
}

function margeUnitaire(p) {
  return p.prixVente - prixAchatUnitaire(p)
}

function margePourcentage(p) {
  const cout = prixAchatUnitaire(p)
  return cout > 0 ? (margeUnitaire(p) / cout) * 100 : 0
}

function formatFCFA(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}

function formatDateHeure(dateStr) {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('fr-FR')
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${date} à ${heure}`
}

function formatDateSeule(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function genererTexteFacture(facture) {
  const lignes = facture.items
    .map(i => `${i.nom} x${i.quantite} = ${formatFCFA(i.prixVente * i.quantite)}`)
    .join('\n')

  return (
    `🧾 RV - Facture #${facture.numero}\n` +
    `${formatDateHeure(facture.date)}\n` +
    (facture.client ? `Client : ${facture.client}\n` : '') +
    `\n${lignes}\n\n` +
    `Total : ${formatFCFA(facture.totalVente)}`
  )
}

async function partagerFacture(facture) {
  const texte = genererTexteFacture(facture)

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Facture RV #${facture.numero}`,
        text: texte,
      })
      return
    } catch (e) {
      // annulé par l'utilisateur ou échec -> on retombe sur WhatsApp
    }
  }

  const url = `https://wa.me/?text=${encodeURIComponent(texte)}`
  window.open(url, '_blank')
}

export default function App() {
  const [connecte, setConnecte] = useState(() => sessionStorage.getItem(LS_SESSION_APP) === 'oui')
  const [pagesDeverrouillees, setPagesDeverrouillees] = useState(
    () => sessionStorage.getItem(LS_SESSION_PAGES) === 'oui'
  )
  const [pageAttendue, setPageAttendue] = useState(null)

  const [page, setPage] = useState('stock')
  const [produits, setProduits] = useState(chargerProduits)
  const [factures, setFactures] = useState(chargerFactures)
  const [factureNum, setFactureNum] = useState(chargerNum)
  const [panier, setPanier] = useState([])
  const [nomClient, setNomClient] = useState('')
  const [produitPourQte, setProduitPourQte] = useState(null)
  const [qteChoisie, setQteChoisie] = useState(1)
  const [afficherAjoutProduit, setAfficherAjoutProduit] = useState(false)
  const [produitAModifier, setProduitAModifier] = useState(null)

  useEffect(() => {
    localStorage.setItem(LS_PRODUITS, JSON.stringify(produits))
  }, [produits])

  useEffect(() => {
    localStorage.setItem(LS_FACTURES, JSON.stringify(factures))
  }, [factures])

  useEffect(() => {
    localStorage.setItem(LS_NUM, String(factureNum))
  }, [factureNum])

  function seConnecter(motDePasse) {
    if (motDePasse === MOT_DE_PASSE_APP) {
      sessionStorage.setItem(LS_SESSION_APP, 'oui')
      setConnecte(true)
      return true
    }
    return false
  }

  function seDeconnecter() {
    sessionStorage.removeItem(LS_SESSION_APP)
    sessionStorage.removeItem(LS_SESSION_PAGES)
    setConnecte(false)
    setPagesDeverrouillees(false)
    setPage('stock')
  }

  function allerAPage(cible) {
    if (PAGES_PROTEGEES.includes(cible) && !pagesDeverrouillees) {
      setPageAttendue(cible)
      return
    }
    setPage(cible)
  }

  function validerMotDePassePage(motDePasse) {
    if (motDePasse === MOT_DE_PASSE_PAGES) {
      sessionStorage.setItem(LS_SESSION_PAGES, 'oui')
      setPagesDeverrouillees(true)
      setPage(pageAttendue)
      setPageAttendue(null)
      return true
    }
    return false
  }

  function ouvrirSelecteurQte(produit) {
    setProduitPourQte(produit)
    setQteChoisie(1)
  }

  function confirmerAjoutPanier() {
    if (!produitPourQte) return
    const p = produitPourQte
    const qte = Math.max(1, Math.min(qteChoisie, p.stock))
    setPanier(prev => {
      const existant = prev.find(i => i.produitId === p.id)
      if (existant) {
        return prev.map(i =>
          i.produitId === p.id ? { ...i, quantite: i.quantite + qte } : i
        )
      }
      return [
        ...prev,
        {
          produitId: p.id,
          nom: p.nom,
          prixVente: p.prixVente,
          prixAchatUnitaire: prixAchatUnitaire(p),
          quantite: qte,
        },
      ]
    })
    setProduitPourQte(null)
  }

  function retirerDuPanier(produitId) {
    setPanier(prev => prev.filter(i => i.produitId !== produitId))
  }

  function totalPanierVente() {
    return panier.reduce((s, i) => s + i.prixVente * i.quantite, 0)
  }

  function emettreFacture() {
    if (panier.length === 0) return
    const totalVente = panier.reduce((s, i) => s + i.prixVente * i.quantite, 0)
    const totalCout = panier.reduce((s, i) => s + i.prixAchatUnitaire * i.quantite, 0)
    const benefice = totalVente - totalCout

    const facture = {
      numero: factureNum,
      date: new Date().toISOString(),
      client: nomClient.trim(),
      items: panier,
      totalVente,
      cout: totalCout,
      benefice,
    }

    setFactures(prev => [...prev, facture])
    setFactureNum(prev => prev + 1)

    setProduits(prev =>
      prev.map(p => {
        const item = panier.find(i => i.produitId === p.id)
        if (!item) return p
        return { ...p, stock: Math.max(0, p.stock - item.quantite) }
      })
    )

    setPanier([])
    setNomClient('')
    imprimerFacture(facture)
  }

  function annulerFacture(numero) {
    const facture = factures.find(f => f.numero === numero)
    if (!facture) return
    if (!window.confirm(`Annuler la facture #${numero} ? Le stock des produits vendus sera restitué. Cette action est irréversible.`)) {
      return
    }

    setProduits(prev =>
      prev.map(p => {
        const item = facture.items.find(i => i.produitId === p.id)
        if (!item) return p
        return { ...p, stock: p.stock + item.quantite }
      })
    )

    setFactures(prev => prev.filter(f => f.numero !== numero))
  }

  function imprimerFacture(facture) {
    const lignes = facture.items
      .map(
        i =>
          `<tr><td>${i.nom}</td><td>${i.quantite}</td><td>${formatFCFA(
            i.prixVente
          )}</td><td>${formatFCFA(i.prixVente * i.quantite)}</td></tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Facture RV #${facture.numero}</title>
<style>
  body { font-family: monospace; background: #f5e9d3; padding: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  td, th { padding: 4px; text-align: left; border-bottom: 1px solid #ccc; }
  h2 { margin-bottom: 0; }
</style>
</head>
<body>
  <h2>RV</h2>
  <p>Facture #${facture.numero}<br/>${formatDateHeure(facture.date)}</p>
  ${facture.client ? `<p><strong>Client :</strong> ${facture.client}</p>` : ''}
  <table>
    <thead><tr><th>Produit</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <p><strong>Total : ${formatFCFA(facture.totalVente)}</strong></p>
</body>
</html>`

    const fenetre = window.open('', '_blank')
    if (fenetre) {
      fenetre.document.open()
      fenetre.document.write(html)
      fenetre.document.close()
      fenetre.print()
    }
  }

  function beneficeTotalRealise() {
    return factures.reduce((s, f) => s + (f.benefice || 0), 0)
  }

  function ajouterProduit(data) {
    setProduits(prev => {
      const nouvelId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1
      return [...prev, { id: nouvelId, ...data }]
    })
    setAfficherAjoutProduit(false)
  }

  function modifierProduit(id, data) {
    setProduits(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)))
    setProduitAModifier(null)
  }

  function supprimerProduit(id) {
    setProduits(prev => prev.filter(p => p.id !== id))
  }

  if (!connecte) {
    return <EcranConnexion onValider={seConnecter} />
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-20">
      <header className="bg-amber-800 text-white p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">RV</span>
          <span className="text-sm opacity-80">Gestion de comptoir</span>
        </div>
        <button onClick={seDeconnecter} className="text-sm bg-amber-900 px-3 py-1 rounded">
          Déconnexion
        </button>
      </header>

      <main className="p-4">
        {page === 'stock' && (
          <PageStock
            produits={produits}
            onAjouterPanier={ouvrirSelecteurQte}
            panier={panier}
            onOuvrirAjout={() => setAfficherAjoutProduit(true)}
            onSupprimer={supprimerProduit}
            onModifier={p => setProduitAModifier(p)}
          />
        )}

        {page === 'panier' && (
          <PagePanier
            panier={panier}
            onRetirer={retirerDuPanier}
            total={totalPanierVente()}
            onEmettre={emettreFacture}
            nomClient={nomClient}
            setNomClient={setNomClient}
          />
        )}

        {page === 'factures' && (
          <PageFactures factures={factures} onAnnuler={annulerFacture} onPartager={partagerFacture} />
        )}

        {page === 'recette' && (
          <PageRecette factures={factures} />
        )}

        {page === 'marge' && (
          <PageMarge produits={produits} beneficeTotal={beneficeTotalRealise()} />
        )}
      </main>

      {produitPourQte && (
        <SelecteurQuantite
          produit={produitPourQte}
          qte={qteChoisie}
          setQte={setQteChoisie}
          onConfirmer={confirmerAjoutPanier}
          onAnnuler={() => setProduitPourQte(null)}
        />
      )}

      {afficherAjoutProduit && (
        <FormProduit
          titre="Nouveau produit"
          onValider={ajouterProduit}
          onAnnuler={() => setAfficherAjoutProduit(false)}
        />
      )}

      {produitAModifier && (
        <FormProduit
          titre="Modifier le produit"
          produit={produitAModifier}
          onValider={data => modifierProduit(produitAModifier.id, data)}
          onAnnuler={() => setProduitAModifier(null)}
        />
      )}

      {pageAttendue && (
        <EcranMotDePassePage
          onValider={validerMotDePassePage}
          onAnnuler={() => setPageAttendue(null)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-amber-800 text-white flex justify-around p-2 overflow-x-auto">
        <button onClick={() => allerAPage('stock')} className={page === 'stock' ? 'font-bold underline' : ''}>
          📦 Stock
        </button>
        <button onClick={() => allerAPage('panier')} className={page === 'panier' ? 'font-bold underline' : ''}>
          🛒 Panier ({panier.length})
        </button>
        <button onClick={() => allerAPage('factures')} className={page === 'factures' ? 'font-bold underline' : ''}>
          🧾 Factures
        </button>
        <button onClick={() => allerAPage('recette')} className={page === 'recette' ? 'font-bold underline' : ''}>
          💰 Recette {!pagesDeverrouillees && '🔒'}
        </button>
        <button onClick={() => allerAPage('marge')} className={page === 'marge' ? 'font-bold underline' : ''}>
          📊 Marge {!pagesDeverrouillees && '🔒'}
        </button>
      </nav>
    </div>
  )
}

function EcranConnexion({ onValider }) {
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(false)

  function valider() {
    const ok = onValider(motDePasse)
    if (!ok) {
      setErreur(true)
      setMotDePasse('')
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow space-y-3 text-center">
        <div className="text-3xl font-bold text-amber-900">RV</div>
        <div className="text-sm text-gray-600 mb-2">Gestion de comptoir</div>
        <input
          type="password"
          value={motDePasse}
          onChange={e => { setMotDePasse(e.target.value); setErreur(false) }}
          onKeyDown={e => e.key === 'Enter' && valider()}
          className="w-full border rounded p-3 text-center"
          placeholder="Mot de passe"
          autoFocus
        />
        {erreur && <div className="text-red-600 text-sm">Mot de passe incorrect.</div>}
        <button onClick={valider} className="w-full bg-amber-700 text-white py-2 rounded font-bold">
          Se connecter
        </button>
      </div>
    </div>
  )
}

function EcranMotDePassePage({ onValider, onAnnuler }) {
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(false)

  function valider() {
    const ok = onValider(motDePasse)
    if (!ok) {
      setErreur(true)
      setMotDePasse('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-3 text-center">
        <div className="text-lg font-bold">🔒 Accès protégé</div>
        <input
          type="password"
          value={motDePasse}
          onChange={e => { setMotDePasse(e.target.value); setErreur(false) }}
          onKeyDown={e => e.key === 'Enter' && valider()}
          className="w-full border rounded p-3 text-center"
          placeholder="Mot de passe"
          autoFocus
        />
        {erreur && <div className="text-red-600 text-sm">Mot de passe incorrect.</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onAnnuler} className="flex-1 bg-gray-200 py-2 rounded">
            Annuler
          </button>
          <button onClick={valider} className="flex-1 bg-amber-700 text-white py-2 rounded">
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}

function PageStock({ produits, onAjouterPanier, onOuvrirAjout, onSupprimer, onModifier }) {
  function confirmerSuppression(p) {
    if (window.confirm(`Supprimer "${p.nom}" du stock ? Cette action est irréversible.`)) {
      onSupprimer(p.id)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-amber-900">Stock</h2>
        <button onClick={onOuvrirAjout} className="bg-green-700 text-white px-3 py-2 rounded text-sm">
          + Produit
        </button>
      </div>
      {produits.map(p => (
        <div key={p.id} className="bg-white rounded-lg p-3 shadow flex justify-between items-center">
          <div>
            <div className="font-semibold">{p.nom}</div>
            <div className="text-sm text-gray-600">
              Stock : {p.stock} {p.stock <= p.stockAlerte && <span className="text-red-600 font-bold">⚠ bas</span>}
            </div>
            <div className="text-sm text-gray-600">Prix : {formatFCFA(p.prixVente)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAjouterPanier(p)}
              disabled={p.stock <= 0}
              className="bg-amber-700 text-white px-3 py-2 rounded disabled:opacity-40"
            >
              Ajouter
            </button>
            <button
              onClick={() => onModifier(p)}
              className="text-amber-800 text-xl px-2"
              aria-label="Modifier le produit"
            >
              ✏️
            </button>
            <button
              onClick={() => confirmerSuppression(p)}
              className="text-red-600 text-xl px-2"
              aria-label="Supprimer le produit"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function FormProduit({ titre, produit, onValider, onAnnuler }) {
  const [nom, setNom] = useState(produit?.nom || '')
  const [lotTaille, setLotTaille] = useState(produit?.lotTaille ?? '')
  const [lotPrix, setLotPrix] = useState(produit?.lotPrix ?? '')
  const [prixVente, setPrixVente] = useState(produit?.prixVente ?? '')
  const [stock, setStock] = useState(produit?.stock ?? '')
  const [stockAlerte, setStockAlerte] = useState(produit?.stockAlerte ?? '')

  function valider() {
    if (!nom || !lotTaille || !lotPrix || !prixVente || stock === '') {
      alert('Merci de remplir tous les champs obligatoires.')
      return
    }
    onValider({
      nom,
      lotTaille: parseFloat(lotTaille),
      lotPrix: parseFloat(lotPrix),
      prixVente: parseFloat(prixVente),
      stock: parseInt(stock, 10),
      stockAlerte: stockAlerte !== '' ? parseInt(stockAlerte, 10) : 5,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-sm space-y-2 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-2">{titre}</h3>

        <label className="block text-sm text-gray-600">Nom du produit</label>
        <input
          type="text"
          value={nom}
          onChange={e => setNom(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ex : Sucre (sac 50kg)"
        />

        <label className="block text-sm text-gray-600">Taille du lot (kg, L, unités...)</label>
        <input
          type="number"
          value={lotTaille}
          onChange={e => setLotTaille(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ex : 50"
        />

        <label className="block text-sm text-gray-600">Prix d'achat du lot entier (FCFA)</label>
        <input
          type="number"
          value={lotPrix}
          onChange={e => setLotPrix(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ex : 30000"
        />

        <label className="block text-sm text-gray-600">Prix de vente unitaire (FCFA)</label>
        <input
          type="number"
          value={prixVente}
          onChange={e => setPrixVente(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ex : 750"
        />

        <label className="block text-sm text-gray-600">Stock {produit ? '' : 'initial'}</label>
        <input
          type="number"
          value={stock}
          onChange={e => setStock(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ex : 50"
        />

        <label className="block text-sm text-gray-600">Seuil d'alerte stock bas (optionnel)</label>
        <input
          type="number"
          value={stockAlerte}
          onChange={e => setStockAlerte(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ex : 10"
        />

        <div className="flex gap-2 pt-2">
          <button onClick={onAnnuler} className="flex-1 bg-gray-200 py-2 rounded">
            Annuler
          </button>
          <button onClick={valider} className="flex-1 bg-amber-700 text-white py-2 rounded">
            {produit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SelecteurQuantite({ produit, qte, setQte, onConfirmer, onAnnuler }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-xs">
        <h3 className="font-bold mb-2">{produit.nom}</h3>
        <p className="text-sm text-gray-600 mb-3">Stock disponible : {produit.stock}</p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setQte(q => Math.max(1, q - 1))}
            className="bg-gray-200 w-10 h-10 rounded text-xl"
          >
            −
          </button>
          <span className="text-2xl font-bold w-12 text-center">{qte}</span>
          <button
            onClick={() => setQte(q => Math.min(produit.stock, q + 1))}
            className="bg-gray-200 w-10 h-10 rounded text-xl"
          >
            +
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={onAnnuler} className="flex-1 bg-gray-200 py-2 rounded">
            Annuler
          </button>
          <button onClick={onConfirmer} className="flex-1 bg-amber-700 text-white py-2 rounded">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

function PagePanier({ panier, onRetirer, total, onEmettre, nomClient, setNomClient }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-amber-900">Panier</h2>
      {panier.length === 0 && <p className="text-gray-500">Panier vide.</p>}
      {panier.map(item => (
        <div key={item.produitId} className="bg-white rounded-lg p-3 shadow flex justify-between items-center">
          <div>
            <div className="font-semibold">{item.nom}</div>
            <div className="text-sm text-gray-600">
              {item.quantite} × {formatFCFA(item.prixVente)} = {formatFCFA(item.prixVente * item.quantite)}
            </div>
          </div>
          <button onClick={() => onRetirer(item.produitId)} className="text-red-600 text-sm">
            Retirer
          </button>
        </div>
      ))}
      {panier.length > 0 && (
        <div className="bg-white rounded-lg p-3 shadow space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nom du client (optionnel)</label>
            <input
              type="text"
              value={nomClient}
              onChange={e => setNomClient(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Ex : Mme Diallo"
            />
          </div>
          <div className="font-bold text-lg">Total : {formatFCFA(total)}</div>
          <button onClick={onEmettre} className="w-full bg-green-700 text-white py-2 rounded font-bold">
            Émettre la facture
          </button>
        </div>
      )}
    </div>
  )
}

function PageFactures({ factures, onAnnuler, onPartager }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-amber-900">Factures</h2>
      {factures.length === 0 && <p className="text-gray-500">Aucune facture.</p>}
      {[...factures].reverse().map(f => (
        <div key={f.numero} className="bg-white rounded-lg p-3 shadow flex justify-between items-start">
          <div>
            <div className="font-semibold">Facture #{f.numero}</div>
            <div className="text-sm text-gray-600">{formatDateHeure(f.date)}</div>
            {f.client && <div className="text-sm text-gray-700">Client : {f.client}</div>}
            <div className="text-sm">Total : {formatFCFA(f.totalVente)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPartager(f)}
              className="text-green-700 text-xl px-2"
              aria-label="Partager la facture"
            >
              📤
            </button>
            <button
              onClick={() => onAnnuler(f.numero)}
              className="text-red-600 text-xl px-2"
              aria-label="Annuler la facture"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PageRecette({ factures }) {
  const parJour = {}
  factures.forEach(f => {
    const jour = formatDateSeule(f.date)
    parJour[jour] = (parJour[jour] || 0) + f.totalVente
  })

  const jours = Object.keys(parJour).sort((a, b) => {
    const [ja, ma, aa] = a.split('/')
    const [jb, mb, ab] = b.split('/')
    return new Date(`${ab}-${mb}-${jb}`) - new Date(`${aa}-${ma}-${ja}`)
  })

  const aujourdHui = formatDateSeule(new Date().toISOString())

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-amber-900">Recette journalière</h2>
      {jours.length === 0 && <p className="text-gray-500">Aucune vente enregistrée.</p>}
      {jours.map(jour => (
        <div
          key={jour}
          className={`rounded-lg p-3 shadow flex justify-between items-center ${
            jour === aujourdHui ? 'bg-amber-200' : 'bg-white'
          }`}
        >
          <div className="font-semibold">
            {jour} {jour === aujourdHui && <span className="text-xs text-amber-800">(aujourd'hui)</span>}
          </div>
          <div className="text-lg font-bold text-amber-900">{formatFCFA(parJour[jour])}</div>
        </div>
      ))}
    </div>
  )
}

function PageMarge({ produits, beneficeTotal }) {
  const margePotentielleTotale = produits.reduce(
    (s, p) => s + margeUnitaire(p) * p.stock,
    0
  )

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-amber-900">Marge</h2>

      <div className="bg-green-100 rounded-lg p-3 shadow">
        <div className="text-sm text-gray-700">Bénéfice total réalisé (toutes factures)</div>
        <div className="text-xl font-bold text-green-800">{formatFCFA(beneficeTotal)}</div>
      </div>

      <div className="bg-blue-100 rounded-lg p-3 shadow">
        <div className="text-sm text-gray-700">Marge potentielle totale (sur le stock actuel)</div>
        <div className="text-xl font-bold text-blue-800">{formatFCFA(margePotentielleTotale)}</div>
      </div>

      {produits.map(p => (
        <div key={p.id} className="bg-white rounded-lg p-3 shadow">
          <div className="font-semibold">{p.nom}</div>
          <div className="text-sm text-gray-600">Coût unitaire : {formatFCFA(prixAchatUnitaire(p))}</div>
          <div className="text-sm text-gray-600">Prix vente : {formatFCFA(p.prixVente)}</div>
          <div className="text-sm text-green-700">
            Marge : {formatFCFA(margeUnitaire(p))} ({margePourcentage(p).toFixed(1)}%)
          </div>
        </div>
      ))}
    </div>
  )
}
