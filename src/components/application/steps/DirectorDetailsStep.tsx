// Step 2: Director/Guarantor Details
// Collect director information for guarantee

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useApplicationStore } from '@/stores/applicationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AUSTRALIAN_STATES, type Director } from '@/types/application';
import {
  User,
  Plus,
  Trash2,
  ChevronLeft,
  HelpCircle,
  Star,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const emptyDirector: Director = {
  firstName: '',
  lastName: '',
  dob: '',
  email: '',
  phone: '',
  address: '',
  suburb: '',
  state: '',
  postcode: '',
  licenceNumber: '',
  licenceState: '',
};

export function DirectorDetailsStep() {
  const { application, addDirector, removeDirector, updateDirector, updateDirectors, nextStep, prevStep } =
    useApplicationStore();

  const [editingIndex, setEditingIndex] = useState<number | null>(
    application.directors.directors.length === 0 ? -1 : null
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Director>({
    defaultValues: emptyDirector,
  });

  const handleAddDirector = (data: Director) => {
    if (editingIndex === -1) {
      // Adding new director
      addDirector(data);
    } else if (editingIndex !== null) {
      // Editing existing director
      updateDirector(editingIndex, data);
    }
    reset(emptyDirector);
    setEditingIndex(null);
  };

  const handleEditDirector = (index: number) => {
    const director = application.directors.directors[index];
    reset(director);
    setEditingIndex(index);
  };

  const handleRemoveDirector = (index: number) => {
    removeDirector(index);
    if (editingIndex === index) {
      reset(emptyDirector);
      setEditingIndex(null);
    }
  };

  const handleSetPrimary = (index: number) => {
    updateDirectors({ primaryContactIndex: index });
  };

  const handleContinue = () => {
    if (application.directors.directors.length >= 1) {
      nextStep();
    }
  };

  const showForm = editingIndex !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          Director &amp; Guarantor Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Add directors or guarantors who will personally guarantee the finance
        </p>
      </div>

      {/* Director List */}
      {application.directors.directors.length > 0 && !showForm && (
        <div className="space-y-3">
          {application.directors.directors.map((director, index) => (
            <Card
              key={index}
              className={
                index === application.directors.primaryContactIndex
                  ? 'border-green-200 bg-green-50'
                  : ''
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {director.firstName} {director.lastName}
                        </p>
                        {index === application.directors.primaryContactIndex && (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-200"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Primary Contact
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{director.email}</p>
                      <p className="text-sm text-gray-500">{director.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index !== application.directors.primaryContactIndex && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                        className="text-gray-500 hover:text-green-600"
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDirector(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDirector(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={() => {
              reset(emptyDirector);
              setEditingIndex(-1);
            }}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Director
          </Button>
        </div>
      )}

      {/* Director Form */}
      {showForm && (
        <form onSubmit={handleSubmit(handleAddDirector)} className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {editingIndex === -1 ? 'Add Director/Guarantor' : 'Edit Director'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register('firstName', { required: 'First name is required' })}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register('lastName', { required: 'Last name is required' })}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* DOB */}
              <div className="space-y-2">
                <Label htmlFor="dob" className="flex items-center gap-2">
                  Date of Birth *
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Used for identity verification and credit check</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  {...register('dob', {
                    required: 'Date of birth is required',
                    validate: (value) => {
                      const age =
                        (new Date().getTime() - new Date(value).getTime()) /
                        (1000 * 60 * 60 * 24 * 365);
                      return age >= 18 || 'Must be at least 18 years old';
                    },
                  })}
                />
                {errors.dob && (
                  <p className="text-sm text-red-500">{errors.dob.message}</p>
                )}
              </div>

              {/* Contact */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email',
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0412 345 678"
                    {...register('phone', { required: 'Phone is required' })}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Residential Address *</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  {...register('address', { required: 'Address is required' })}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb *</Label>
                  <Input
                    id="suburb"
                    {...register('suburb', { required: 'Suburb is required' })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Controller
                    name="state"
                    control={control}
                    rules={{ required: 'State is required' }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUSTRALIAN_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    maxLength={4}
                    {...register('postcode', {
                      required: 'Postcode is required',
                      pattern: { value: /^\d{4}$/, message: 'Invalid' },
                    })}
                  />
                </div>
              </div>

              {/* Driver's Licence */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="licenceNumber">Driver's Licence Number</Label>
                  <Input
                    id="licenceNumber"
                    {...register('licenceNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenceState">Licence State</Label>
                  <Controller
                    name="licenceState"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUSTRALIAN_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset(emptyDirector);
                    setEditingIndex(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {editingIndex === -1 ? 'Add Director' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={application.directors.directors.length === 0 || showForm}
          className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 hover:from-green-900 hover:via-green-800 hover:to-emerald-700"
        >
          Continue to Asset Details
        </Button>
      </div>

      {/* AI Explainer */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Why we ask this:</strong> All finance requires a personal
          guarantee from directors. We collect details upfront to streamline the
          approval process and prepare your documents.
        </p>
      </div>
    </div>
  );
}
