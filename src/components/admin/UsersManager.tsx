import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Edit, Calendar, Crown, Shield, User, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface Profile {
  id: string;
  nama: string;
  role: 'biasa' | 'premium' | 'admin';
  premium_until?: string;
  created_at: string;
}

const userUpdateSchema = z.object({
  role: z.enum(['biasa', 'premium', 'admin']),
  premium_until: z.string().optional(),
});

type UserUpdateFormData = z.infer<typeof userUpdateSchema>;

const UsersManager = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserUpdateFormData>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      role: 'biasa',
      premium_until: '',
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role || 'biasa') as 'biasa' | 'premium' | 'admin'
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = async (data: UserUpdateFormData) => {
    if (!editingUser) return;

    try {
      // Update profile's premium_until
      const profileUpdateData: any = {};
      
      // Only include premium_until if role is premium and date is provided
      if (data.role === 'premium' && data.premium_until) {
        profileUpdateData.premium_until = new Date(data.premium_until).toISOString();
      } else if (data.role !== 'premium') {
        profileUpdateData.premium_until = null;
      }

      // Update profiles table if there are changes
      if (Object.keys(profileUpdateData).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', editingUser.id);

        if (profileError) throw profileError;
      }

      // Update role in user_roles table
      // First, delete existing role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.id);

      if (deleteError) throw deleteError;

      // Then insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: editingUser.id, role: data.role });

      if (insertError) throw insertError;

      toast({
        title: 'Berhasil',
        description: 'Data pengguna berhasil diperbarui',
      });

      setEditingUser(null);
      setIsDialogOpen(false);
      form.reset();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Gagal memperbarui data pengguna',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    form.setValue('role', user.role);
    if (user.premium_until) {
      const date = new Date(user.premium_until);
      form.setValue('premium_until', date.toISOString().split('T')[0]);
    }
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'premium': return <Crown className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (user: Profile) => {
    if (user.role === 'admin') {
      return (
        <Badge className="bg-red-500/20 text-red-300">
          <Shield className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      );
    }
    
    if (user.role === 'premium') {
      const isPremiumActive = !user.premium_until || new Date(user.premium_until) > new Date();
      return (
        <Badge className={isPremiumActive ? "premium-badge" : "bg-gray-500/20 text-gray-300"}>
          <Crown className="mr-1 h-3 w-3" />
          Premium {!isPremiumActive ? '(Expired)' : ''}
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        <User className="mr-1 h-3 w-3" />
        Biasa
      </Badge>
    );
  };

  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  if (loading) {
    return <div className="text-center py-4">Memuat data pengguna...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Daftar Pengguna</h3>
        <div className="flex items-center space-x-2">
          {width < 768 ? '':
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pengguna</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Premium Aktif</p>
              <p className="text-2xl font-bold">
                {users.filter(u => u.role === 'premium' && (!u.premium_until || new Date(u.premium_until) > new Date())).length}
              </p>
            </div>
            <Crown className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admin</p>
              <p className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Premium Hingga</TableHead>
              <TableHead>Bergabung</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Pengguna tidak ditemukan' : 'Belum ada pengguna terdaftar'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nama}</TableCell>
                  <TableCell>{getRoleBadge(user)}</TableCell>
                  <TableCell>
                    {user.premium_until ? (
                      <div className="text-sm">
                        {new Date(user.premium_until).toLocaleDateString('id-ID')}
                        {new Date(user.premium_until) <= new Date() && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Dialog open={isDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                        if (!open) handleDialogClose();
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            className="flex items-center gap-1 hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit Role</span>
                          </Button>
                        </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Pengguna</DialogTitle>
                          <DialogDescription>
                            Perbarui role dan status premium untuk {user.nama}
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Role</FormLabel>
                                   <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Pilih role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="biasa">Biasa</SelectItem>
                                      <SelectItem value="premium">Premium</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {form.watch('role') === 'premium' && (
                              <FormField
                                control={form.control}
                                name="premium_until"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Premium Hingga</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                      Atur tanggal berakhirnya akses premium
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={handleDialogClose}>
                                Batal
                              </Button>
                              <Button type="submit">
                                Perbarui
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UsersManager;
