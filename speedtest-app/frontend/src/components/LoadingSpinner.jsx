import React from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { motion } from 'framer-motion'

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = 'medium',
  variant = 'primary' 
}) => {
  const theme = useTheme()
  
  const sizes = {
    small: { 
      spinner: 40, 
      dot: 8, 
      container: '200px',
      fontSize: '0.875rem'
    },
    medium: { 
      spinner: 60, 
      dot: 12, 
      container: '300px',
      fontSize: '1rem'
    },
    large: { 
      spinner: 80, 
      dot: 16, 
      container: '400px',
      fontSize: '1.125rem'
    }
  }
  
  const currentSize = sizes[size]
  
  const variants = {
    primary: {
      primary: theme.palette.primary.main,
      secondary: theme.palette.secondary.main,
      accent: theme.palette.info.main,
    },
    speedtest: {
      primary: '#00ff88', // Green for download
      secondary: '#ff6b35', // Orange for upload  
      accent: '#4ecdc4', // Teal for latency
    },
    analytics: {
      primary: theme.palette.primary.main,
      secondary: theme.palette.purple?.[400] || '#9c27b0',
      accent: theme.palette.info.main,
    }
  }
  
  const colors = variants[variant] || variants.primary
  
  const containerVariants = {
    start: {
      transition: {
        staggerChildren: 0.1
      }
    },
    end: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const circleVariants = {
    start: {
      y: "0%",
      scale: 1
    },
    end: {
      y: "100%",
      scale: 0.8
    }
  }
  
  const circleTransition = {
    duration: 0.4,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut"
  }
  
  const pulseVariants = {
    start: { 
      scale: 0.8, 
      opacity: 0.5,
      rotate: 0
    },
    end: { 
      scale: 1.2, 
      opacity: 0.8,
      rotate: 360
    }
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Animated Background Gradient */}
      <motion.div
        style={{
          position: 'absolute',
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primary}15 0%, ${colors.secondary}10 50%, transparent 70%)`,
          zIndex: 0,
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Main Spinner */}
      <Box
        sx={{
          position: 'relative',
          width: currentSize.spinner,
          height: currentSize.spinner,
          mb: 3,
          zIndex: 1,
        }}
      >
        {/* Outer Ring */}
        <motion.div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: `3px solid ${colors.primary}40`,
            borderTop: `3px solid ${colors.primary}`,
            borderRadius: '50%',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Inner Ring */}
        <motion.div
          style={{
            position: 'absolute',
            top: '25%',
            left: '25%',
            width: '50%',
            height: '50%',
            border: `2px solid ${colors.secondary}40`,
            borderBottom: `2px solid ${colors.secondary}`,
            borderRadius: '50%',
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Center Dot */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: currentSize.dot,
            height: currentSize.dot,
            backgroundColor: colors.accent,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          variants={pulseVariants}
          animate="end"
          initial="start"
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      </Box>
      
      {/* Bouncing Dots */}
      <motion.div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '80px',
          marginBottom: '24px',
        }}
        variants={containerVariants}
        initial="start"
        animate="end"
      >
        {[colors.primary, colors.secondary, colors.accent].map((color, index) => (
          <motion.div
            key={index}
            style={{
              width: '10px',
              height: '10px',
              backgroundColor: color,
              borderRadius: '50%',
              display: 'block',
            }}
            variants={circleVariants}
            transition={{
              ...circleTransition,
              delay: index * 0.1
            }}
          />
        ))}
      </motion.div>
      
      {/* Loading Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 0.5,
          duration: 0.6,
          ease: "easeOut"
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.primary,
            fontSize: currentSize.fontSize,
            fontWeight: 500,
            textAlign: 'center',
            mb: 1,
          }}
        >
          {message}
        </Typography>
        
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: theme.palette.text.secondary,
                borderRadius: '50%',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>
      
      {/* Progress Wave Effect */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '4px',
          backgroundColor: `${colors.primary}20`,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{
            width: '50px',
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: '2px',
          }}
          animate={{
            x: ['-100px', '250px'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </Box>
  )
}

export default LoadingSpinner
