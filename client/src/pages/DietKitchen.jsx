import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, UtensilsCrossed, CheckCircle, ThumbsUp, AlertTriangle, User, FileText, ChefHat, Send, Star, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const dietApi = {
  getOrders: (p = {}) => api.dispatch(() => Promise.resolve({ orders: [] }), '/diet/orders?' + new URLSearchParams(p)),
  createOrder: (b) => api.dispatch(() => Promise.resolve({}), '/diet/orders', { method: 'POST', body: JSON.stringify(b) }),
  deliverMeal: (id, b) => api.dispatch(() => Promise.resolve({}), `/diet/orders/${id}/deliver-meal`, { method: 'PUT', body: JSON.stringify(b) }),
  confirmMeal: (id, b) => api.dispatch(() => Promise.resolve({}), `/diet/orders/${id}/confirm-meal`, { method: 'PUT', body: JSON.stringify(b) }),
  review: (id, b) => api.dispatch(() => Promise.resolve({}), `/diet/orders/${id}/review`, { method: 'PUT', body: JSON.stringify(b) }),
  addFeedback: (id, b) => api.dispatch(() => Promise.resolve({}), `/diet/orders/${id}/feedback`, { method: 'PUT', body: JSON.stringify(b) }),
  notifyKitchen: (id) => api.dispatch(() => Promise.resolve({}), `/diet/orders/${id}/notify`, { method: 'PUT' }),
  addToBilling: (id, b) => api.dispatch(() => Promise.resolve({}), `/diet/orders/${id}/billing`, { method: 'POST', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ active: 0, todayMeals: 0, pendingReview: 0, total: 0 }), '/diet/stats'),
};

const dietTypeColors = {
  Regular: 'bg-success/10 text-success', Diabetic: 'bg-info/10 text-info',
  'Low Sodium': 'bg-primary/10 text-primary', Liquid: 'bg-warning/10 text-warning',
  Soft: 'bg-orange-500/10 text-orange-600', 'High Protein': 'bg-purple-500/10 text-purple-600',
  'Low Fat': 'bg-green-500/10 text-green-600', Renal: 'bg-red-500/10 text-red-600',
  NPO: 'bg-destructive/10 text-destructive', Other: 'bg-muted text-muted-foreground',
};

const mealTypes = ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'];

export default function DietKitchen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [showFeedback, setShowFeedback] = useState(null);
  const [feedbackData, setFeedbackData] = useState({ taste: 'Good', quantity: 'Adequate', comments: '' });
  const [newOrder, setNewOrder] = useState({
    patientName: '', patientId: '', ward: '', bedNumber: '', dietType: 'Regular',
    mealTimes: ['Breakfast', 'Lunch', 'Dinner'], instructions: '', allergies: '',
    doctorName: '', referringDoctorId: ''
  });

  const { data } = useQuery({ queryKey: ['diet-orders', search, statusFilter], queryFn: () => dietApi.getOrders({ search, status: statusFilter }) });
  const { data: stats } = useQuery({ queryKey: ['diet-stats'], queryFn: dietApi.getStats });
  const orders = data?.orders || [];

  const createMut = useMutation({ mutationFn: dietApi.createOrder, onSuccess: () => { qc.invalidateQueries(['diet-orders', 'diet-stats']); setShowCreate(false); } });
  const deliverMut = useMutation({ mutationFn: ({ id, ...b }) => dietApi.deliverMeal(id, b), onSuccess: () => qc.invalidateQueries(['diet-orders']) });
  const confirmMut = useMutation({ mutationFn: ({ id, ...b }) => dietApi.confirmMeal(id, b), onSuccess: () => qc.invalidateQueries(['diet-orders']) });
  const reviewMut = useMutation({ mutationFn: ({ id, ...b }) => dietApi.review(id, b), onSuccess: () => { qc.invalidateQueries(['diet-orders']); setShowReview(false); } });
  const feedbackMut = useMutation({ mutationFn: ({ id, ...b }) => dietApi.addFeedback(id, b), onSuccess: () => { qc.invalidateQueries(['diet-orders']); setShowFeedback(null); } });
  const notifyMut = useMutation({ mutationFn: dietApi.notifyKitchen, onSuccess: () => qc.invalidateQueries(['diet-orders']) });
  const billingMut = useMutation({ mutationFn: ({ id, ...b }) => dietApi.addToBilling(id, b), onSuccess: () => qc.invalidateQueries(['diet-orders']) });

  const renderFeedbackForm = (order) => (
    <div className="bg-muted/30 rounded-xl p-4">
      <h4 className="text-sm font-semibold mb-3">Patient Meal Feedback</h4>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Taste</label>
          <div className="flex gap-2">
            {['Good', 'Average', 'Bad'].map(t => (
              <button key={t} onClick={() => setFeedbackData(f => ({ ...f, taste: t }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${feedbackData.taste === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
          <div className="flex gap-2">
            {['Adequate', 'Too Much', 'Too Little'].map(q => (
              <button key={q} onClick={() => setFeedbackData(f => ({ ...f, quantity: q }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${feedbackData.quantity === q ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Comments</label>
          <textarea value={feedbackData.comments} onChange={e => setFeedbackData(f => ({ ...f, comments: e.target.value }))}
            placeholder="Any suggestions for improvement..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-16"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => feedbackMut.mutate({ id: order._id, mealIndex: 0, ...feedbackData })}>
            Submit Feedback
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowFeedback(null)}>Cancel</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Diet & Kitchen</h1>
        <p className="page-subtitle">{stats?.active || 0} active orders · {stats?.todayMeals || 0} meals today · {stats?.pendingReview || 0} pending review</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Active Orders', v: stats?.active || 0, c: 'text-primary', ic: UtensilsCrossed },
          { l: "Today's Meals", v: stats?.todayMeals || 0, c: 'text-success', ic: CheckCircle },
          { l: 'Pending Review', v: stats?.pendingReview || 0, c: 'text-warning', ic: ChefHat },
          { l: 'Total Orders', v: stats?.total || 0, c: 'text-foreground', ic: FileText },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <s.ic className={`w-5 h-5 mx-auto mb-1 ${s.c}`} />
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Completed">Completed</option>
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Diet Order</Button>
      </div>

      <div className="space-y-4">
        {orders.map(order => {
          const isExpanded = expandedId === order._id;
          return (
            <div key={order._id} className={`bg-card rounded-xl border shadow-sm ${order.status === 'Pending Review' ? 'ring-1 ring-warning/30 border-warning/20' : ''}`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${dietTypeColors[order.dietType] || ''}`}>{order.dietType}</span>
                  {order.dietType === 'NPO' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{order.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.ward ? `${order.ward} · Bed ${order.bedNumber}` : 'No ward'}
                      {order.doctorName && ` · Dr. ${order.doctorName}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'Active' ? 'bg-success/10 text-success' : order.status === 'Pending Review' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{order.status}</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Doctor</span><p className="font-medium">{order.doctorName || 'Not specified'}</p></div>
                    <div><span className="text-muted-foreground">Instructions</span><p className="font-medium">{order.instructions || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Allergies</span><p className="font-medium">{order.allergies || 'None'}</p></div>
                    <div><span className="text-muted-foreground">Meals</span><p className="font-medium">{order.mealTimes?.join(', ') || 'N/A'}</p></div>
                  </div>

                  {/* Dietitian Review */}
                  {order.reviewedByDietitian ? (
                    <div className={`rounded-lg p-2 text-xs ${reviewStatus === 'Approved' ? 'bg-success/5 text-success' : 'bg-warning/5 text-warning'}`}>
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      Reviewed by {order.dietitianName || 'Dietitian'} · {order.reviewNotes ? `Notes: ${order.reviewNotes}` : 'No notes'}
                    </div>
                  ) : order.status !== 'Completed' && (
                    <div className="bg-warning/5 rounded-lg p-2 text-xs text-warning flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Pending dietitian review</span>
                      <Button size="sm" variant="outline" onClick={() => { setReviewOrder(order); setShowReview(true); }}>
                        Review Now
                      </Button>
                    </div>
                  )}

                  {/* Kitchen Notification */}
                  {!order.kitchenNotified && order.status === 'Active' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => notifyMut.mutate(order._id)}>
                        <Send className="w-3 h-3 mr-1" /> Notify Kitchen
                      </Button>
                    </div>
                  )}
                  {order.kitchenNotified && (
                    <div className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Kitchen notified
                    </div>
                  )}

                  {/* Meal delivery log */}
                  {order.meals?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Meal History</p>
                      {order.meals.map((m, i) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-foreground">{m.mealType} · {m.date ? new Date(m.date).toLocaleDateString() : 'Today'}</p>
                              <p className="text-[10px] text-muted-foreground">{m.items || 'No items'} · Delivered by {m.deliveredBy || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Patient Feedback */}
                              {m.patientFeedback ? (
                                <div className="flex items-center gap-1">
                                  {m.patientFeedback === 'Good' ? <ThumbsUp className="w-3 h-3 text-success" /> : <Star className="w-3 h-3 text-warning" />}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    m.patientFeedback === 'Good' ? 'bg-success/10 text-success' :
                                    m.patientFeedback === 'Average' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                                  }`}>{m.patientFeedback}</span>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => { setShowFeedback(order); setFeedbackData({ taste: 'Good', quantity: 'Adequate', comments: '' }); }}>
                                  <Star className="w-3 h-3" /> Feedback
                                </Button>
                              )}
                              {/* Nurse Confirmation */}
                              {!m.confirmedByNurse ? (
                                <Button size="sm" variant="outline" onClick={() => confirmMut.mutate({ id: order._id, mealIndex: i, feedback: 'Good' })}>
                                  Confirm
                                </Button>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-success">
                                  <CheckCircle className="w-3 h-3" /> Confirmed
                                </span>
                              )}
                            </div>
                          </div>
                          {m.quantityFeedback && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Qty: {m.quantityFeedback} · {m.comments}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => {
                      const m = prompt('Meal type (Breakfast/Lunch/Evening Snack/Dinner):');
                      if (m && mealTypes.includes(m)) deliverMut.mutate({ id: order._id, mealType: m, items: prompt('Items:') || '' });
                    }}>
                      <UtensilsCrossed className="w-3 h-3 mr-1" /> Deliver Meal
                    </Button>
                    {!order.billingAdded && order.status === 'Completed' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const amt = prompt('Diet charges (Rs):', '200');
                        if (amt) billingMut.mutate({ id: order._id, amount: parseInt(amt) });
                      }}>
                        <FileText className="w-3 h-3 mr-1" /> Add to Billing
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="text-center py-20">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No diet orders found</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>Create First Order</Button>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold">New Diet Order</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newOrder.patientName} onChange={e => setNewOrder({ ...newOrder, patientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Ward</label><Input value={newOrder.ward} onChange={e => setNewOrder({ ...newOrder, ward: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Bed Number</label><Input value={newOrder.bedNumber} onChange={e => setNewOrder({ ...newOrder, bedNumber: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Diet Type *</label>
                  <select value={newOrder.dietType} onChange={e => setNewOrder({ ...newOrder, dietType: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {['Regular', 'Diabetic', 'Low Sodium', 'Liquid', 'Soft', 'High Protein', 'Low Fat', 'Renal', 'NPO', 'Other'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1 block">Doctor Name</label><Input value={newOrder.doctorName} onChange={e => setNewOrder({ ...newOrder, doctorName: e.target.value })} placeholder="Referring doctor" /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Meal Times</label>
                <div className="flex gap-2 flex-wrap">
                  {mealTypes.map(m => (
                    <label key={m} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={newOrder.mealTimes.includes(m)}
                        onChange={() => setNewOrder(o => ({ ...o, mealTimes: o.mealTimes.includes(m) ? o.mealTimes.filter(x => x !== m) : [...o.mealTimes, m] }))} className="w-4 h-4" />{m}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Instructions</label>
                <textarea value={newOrder.instructions} onChange={e => setNewOrder({ ...newOrder, instructions: e.target.value })}
                  className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. No salt, pureed food, tube feed..." />
              </div>
              <div><label className="text-sm font-medium mb-1 block">Allergies</label><Input value={newOrder.allergies} onChange={e => setNewOrder({ ...newOrder, allergies: e.target.value })} /></div>
              <Button className="w-full" onClick={() => createMut.mutate(newOrder)} disabled={createMut.isPending || !newOrder.patientName}>
                {createMut.isPending ? 'Creating...' : 'Create Diet Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dietitian Review Modal */}
      {showReview && reviewOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReview(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Dietitian Review</h3>
              <button onClick={() => setShowReview(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">{reviewOrder.patientName}</p>
                <p className="text-muted-foreground">{reviewOrder.dietType} diet · {reviewOrder.mealTimes?.join(', ')}</p>
                {reviewOrder.instructions && <p className="text-xs text-muted-foreground mt-1">Instructions: {reviewOrder.instructions}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Review Decision</label>
                <div className="flex gap-2">
                  {['Approved', 'Modified', 'Rejected'].map(s => (
                    <button key={s} onClick={() => setReviewStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reviewStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dietitian Notes</label>
                <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none h-20"
                  placeholder="Modifications, concerns, or approval notes..." />
              </div>
              <Button className="w-full" onClick={() => {
                reviewMut.mutate({ id: reviewOrder._id, status: reviewStatus, notes: reviewNotes });
                setReviewNotes('');
              }}>
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && renderFeedbackForm(showFeedback)}
    </div>
  );
}// 29
