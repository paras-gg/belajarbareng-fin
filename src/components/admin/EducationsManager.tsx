import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Calendar, Crown, FileText, PlayCircle, Image } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface Education {
  id: string;
  judul: string;
  topik: string;
  konten: string;
  media_url?: string;
  tipe: 'artikel' | 'video' | 'gambar';
  is_premium: boolean;
  kategori_id: string;
  created_at: string;
  categories: {
    nama_kategori: string;
  };
}

interface Category {
  id: string;
  nama_kategori: string;
}

const educationSchema = z.object({
  judul: z.string().min(1, 'Judul harus diisi'),
  topik: z.string().min(1, 'Topik harus diisi'),
  konten: z.string().min(1, 'Konten harus diisi'),
  media_url: z.string().optional(),
  tipe: z.enum(['artikel', 'video', 'gambar']),
  is_premium: z.boolean(),
  kategori_id: z.string().min(1, 'Kategori harus dipilih'),
});

type EducationFormData = z.infer<typeof educationSchema>;

const EducationsManager = () => {
  const [educations, setEducations] = useState<Education[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<EducationFormData>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      judul: '',
      topik: '',
      konten: '',
      media_url: '',
      tipe: 'artikel',
      is_premium: false,
      kategori_id: '',
    },
  });

  useEffect(() => {
    fetchEducations();
    fetchCategories();
  }, []);

  const fetchEducations = async () => {
    try {
      const { data, error } = await supabase
        .from('educations')
        .select(`
          *,
          categories (
            nama_kategori
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEducations(data || []);
    } catch (error) {
      console.error('Error fetching educations:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat konten edukasi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nama_kategori');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const onSubmit = async (data: EducationFormData) => {
    try {
      if (editingEducation) {
        // Update existing education
        const { error } = await supabase
          .from('educations')
          .update(data)
          .eq('id', editingEducation.id);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Konten edukasi berhasil diperbarui',
        });
      } else {
        // Create new education
        const { error } = await supabase
          .from('educations')
          .insert(data as any);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Konten edukasi berhasil ditambahkan',
        });
      }

      form.reset();
      setEditingEducation(null);
      setIsDialogOpen(false);
      fetchEducations();
    } catch (error) {
      console.error('Error saving education:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan konten edukasi',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (education: Education) => {
    setEditingEducation(education);
    form.setValue('judul', education.judul);
    form.setValue('topik', education.topik);
    form.setValue('konten', education.konten);
    form.setValue('media_url', education.media_url || '');
    form.setValue('tipe', education.tipe);
    form.setValue('is_premium', education.is_premium);
    form.setValue('kategori_id', education.kategori_id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus konten edukasi ini?')) return;

    try {
      const { error } = await supabase
        .from('educations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Konten edukasi berhasil dihapus',
      });
      fetchEducations();
    } catch (error) {
      console.error('Error deleting education:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus konten edukasi',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEducation(null);
    form.reset();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="h-4 w-4" />;
      case 'artikel': return <FileText className="h-4 w-4" />;
      case 'gambar': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-red-500/20 text-red-300';
      case 'artikel': return 'bg-blue-500/20 text-blue-300';
      case 'gambar': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };
  
  if (loading) {
    return <div className="text-center py-4">Memuat konten edukasi...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Daftar Konten Edukasi</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Tambah edukasi</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEducation ? 'Edit Konten Edukasi' : 'Tambah Konten Edukasi Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingEducation 
                  ? 'Perbarui informasi konten edukasi'
                  : 'Tambahkan konten edukasi baru untuk website'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="judul"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan judul konten" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="topik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topik</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan topik konten" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kategori_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.nama_kategori}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Konten</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe konten" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="artikel">Artikel</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="gambar">Gambar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="media_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Media (Opsional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        URL untuk video YouTube, gambar, atau media lainnya
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="konten"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konten</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Masukkan konten edukasi..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_premium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Konten Premium</FormLabel>
                        <FormDescription>
                          Konten hanya dapat diakses oleh member premium
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingEducation ? 'Perbarui' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {educations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada konten edukasi
                </TableCell>
              </TableRow>
            ) : (
              educations.map((education) => (
                <TableRow key={education.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{education.judul}</div>
                      <div className="text-sm text-muted-foreground">{education.topik}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {education.categories.nama_kategori}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getTypeColor(education.tipe)} flex items-center gap-1 w-fit`}>
                      {getTypeIcon(education.tipe)}
                      {education.tipe.charAt(0).toUpperCase() + education.tipe.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {education.is_premium ? (
                      <Badge className="premium-badge">
                        <Crown className="mr-1 h-3 w-3" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Gratis</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(education.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(education)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(education.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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

export default EducationsManager;
