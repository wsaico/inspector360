'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  ClipboardCheck,
  Shield,
  Sparkles,
  MessageCircle,
  HelpCircle,
  Send,
  Phone,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading } = useAuth();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ name: '', email: '', message: '' });
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Ingrese su correo para continuar');
      return;
    }

    setIsSubmitting(true);

    // Verificar si el usuario existe en la base de datos
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('full_name, is_active')
        .eq('email', email.trim().toLowerCase());

      console.log('Email buscado:', email.trim().toLowerCase());
      console.log('Profiles encontrados:', profiles);
      console.log('Error:', error);

      // Usuario no encontrado
      if (error || !profiles || profiles.length === 0) {
        setIsSubmitting(false);
        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Usuario no encontrado</p>
            <p className="text-sm">Este correo no está registrado en el sistema.</p>
            <p className="text-sm">Contacta al administrador por WhatsApp: <strong>+51 930 289 521</strong></p>
          </div>,
          { duration: 6000 }
        );
        return;
      }

      const profile = profiles[0];

      // Verificar si el usuario está activo
      if (!profile.is_active) {
        setIsSubmitting(false);
        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Usuario inactivo</p>
            <p className="text-sm">Tu cuenta está desactivada.</p>
            <p className="text-sm">Contacta al administrador por WhatsApp: <strong>+51 930 289 521</strong></p>
          </div>,
          { duration: 6000 }
        );
        return;
      }

      // Usuario encontrado y activo
      if (profile.full_name) {
        setUserName(profile.full_name);
      }

      setIsSubmitting(false);
      setStep('password');
    } catch (error) {
      setIsSubmitting(false);
      toast.error('Error al verificar el correo electrónico');
      console.error('Error verificando usuario:', error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('Por favor ingresa tu contraseña');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        toast.success('Sesión iniciada correctamente');
        router.replace('/dashboard');
      } else {
        toast.error(result.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      toast.error('Error inesperado al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackData.name || !feedbackData.email || !feedbackData.message) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    setSendingFeedback(true);

    try {
      // Enviar email usando mailto (temporal - puedes integrar con API de email después)
      const subject = encodeURIComponent(`Feedback Inspector 360° - ${feedbackData.name}`);
      const body = encodeURIComponent(
        `Nombre: ${feedbackData.name}\nEmail: ${feedbackData.email}\n\nMensaje:\n${feedbackData.message}`
      );

      window.location.href = `mailto:wilbersaico@gmail.com?subject=${subject}&body=${body}`;

      toast.success('Abriendo cliente de correo...');
      setShowFeedback(false);
      setFeedbackData({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Error al enviar feedback');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/51930289521?text=Hola,%20necesito%20soporte%20con%20Inspector%20360°', '_blank');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 login-page-animate">
      {/* Video de fondo de Vimeo */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          src="https://player.vimeo.com/video/1135113608?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1"
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '177.77777778vh',
            height: '56.25vw',
            minHeight: '100%',
            minWidth: '100%',
          }}
          frameBorder="0"
          allow="autoplay; fullscreen"
        />
      </div>

      {/* Overlay oscuro suave para mejorar legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-purple-900/60 to-slate-900/70 backdrop-blur-[2px] login-overlay-animate"></div>

      {/* Contenido principal */}
      <div className="relative z-10 w-full max-w-[840px]">
        <Card className="bg-white shadow-none border-0 rounded-[28px] min-h-[384px] login-content-animate">
          <CardContent className="px-4 sm:px-6 md:px-9 pt-10 sm:pt-16 md:pt-[108px] pb-6 sm:pb-8 md:pb-9">
            <div className="flex flex-col md:flex-row gap-6 md:gap-12">
              {/* Columna izquierda - Logo y título */}
              <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                <div className="mb-3">
                  <img
                    src="/I360.svg"
                    alt="Inspector 360°"
                    className="h-10 sm:h-12 w-auto logo-animate transition-transform duration-300 hover:scale-[1.03]"
                  />
                </div>

                <h1 className="text-2xl font-normal text-gray-900 mb-1">
                  Bienvenido a Inspector 360°
                </h1>

                <p className="text-sm text-gray-500">
                  Checklist multiuso • Moderno • Inteligente
                </p>
              </div>

              {/* Columna derecha - Formulario */}
              <div className="flex-1 mt-6 md:mt-0">
                {step === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Correo electrónico o teléfono"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        aria-required="true"
                        className="h-14 px-4 text-base border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-[#1C398A] hover:bg-[#152d6f] text-white px-6 h-10 rounded-full font-medium shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          'Siguiente'
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    {userName && (
                      <div className="mb-4">
                        <h2 className="text-2xl font-medium text-gray-900">
                          ¡Hola! {userName}
                        </h2>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStep('email');
                            setUserName(null);
                          }}
                          className="h-auto p-0 text-blue-600 hover:text-blue-700 hover:bg-transparent"
                        >
                          Cambiar
                        </Button>
                      </div>

                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Introduce tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        autoFocus
                        aria-required="true"
                        className="h-14 px-4 text-base border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPassword}
                          onChange={(e) => setShowPassword(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1C398A] focus:ring-2 focus:ring-[#1C398A] cursor-pointer"
                        />
                        <span className="text-sm text-gray-600 select-none">Mostrar contraseña</span>
                      </label>

                      <Button
                        type="submit"
                        className="bg-[#1C398A] hover:bg-[#152d6f] text-white px-6 h-10 rounded-full font-medium shadow-sm"
                        disabled={isSubmitting || loading}
                      >
                        {isSubmitting || loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cargando...
                          </>
                        ) : (
                          'Siguiente'
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Botones de soporte - siempre visible */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-3 text-center">
                    ¿Necesitas ayuda?
                  </p>
                  <div className="flex gap-3 mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleWhatsAppClick}
                      className="flex-1 text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 rounded-full px-4 h-10"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Soporte WhatsApp
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFeedback(true)}
                      className="flex-1 text-purple-600 border-purple-300 hover:bg-purple-50 hover:border-purple-400 rounded-full px-4 h-10"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Enviar Feedback
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Versión 2.0 • Inspector 360° © {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Feedback */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Enviar Feedback
            </DialogTitle>
            <DialogDescription>
              Cuéntanos tu experiencia, sugerencias o reporta un problema
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">Nombre</Label>
              <Input
                id="feedback-name"
                placeholder="Tu nombre"
                value={feedbackData.name}
                onChange={(e) => setFeedbackData({ ...feedbackData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">Email</Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="tu@email.com"
                value={feedbackData.email}
                onChange={(e) => setFeedbackData({ ...feedbackData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Mensaje</Label>
              <Textarea
                id="feedback-message"
                placeholder="Escribe tu feedback aquí..."
                rows={4}
                value={feedbackData.message}
                onChange={(e) => setFeedbackData({ ...feedbackData, message: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFeedback(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={sendingFeedback}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {sendingFeedback ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="pt-2 border-t">
            <p className="text-xs text-center text-muted-foreground">
              También puedes contactarnos por WhatsApp:{' '}
              <button
                onClick={handleWhatsAppClick}
                className="text-green-600 hover:underline font-medium"
              >
                +51 930 289 521
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
